#!/usr/bin/env python3
"""
scripts/train_models.py
=======================
Bootstraps the two ML components of ORBIT:

  Step 1 — Seed synthetic audience_patterns
  -----------------------------------------
  We insert 90 days × 24 hours of synthetic engagement data into the DB for
  the demo user (three platforms: linkedin, youtube, reddit).  Each row
  mimics realistic human-attention curves:

    LinkedIn  — weekday spikes at 7-10 AM and 5-7 PM (professionals)
    YouTube   — afternoon/evening spikes, stronger Thu-Sun (leisure)
    Reddit    — morning spikes Mon-Fri, evening spikes every day

  This gives TimingEngine enough rows (≥ MIN_DATA_POINTS_FOR_ML = 50) to
  replace its industry-default fallback with a real Prophet forecast.

  Step 2 — Train the LightGBM PriorityCalculator
  -----------------------------------------------
  We synthesise 3 000 labelled training examples using the 6 features the
  model expects, then fit a LightGBMClassifier and persist it to
  ./models/priority_model.pkl so PriorityCalculator._load() picks it up.

  Step 3 — Prophet smoke-test
  ---------------------------
  We run one forecast pass over the seeded data for each platform so you can
  see the predicted best-time-to-post in the console right now.

Run from repo root:
    python scripts/train_models.py
"""

from __future__ import annotations

import os
import sys
import pickle
import random
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("train")

# ── Load .env ─────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# ── Constants ─────────────────────────────────────────────────────────────────
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
SEED_DAYS     = 90          # days of history to synthesise
PLATFORMS     = ["linkedin", "youtube", "reddit"]
MODEL_DIR     = Path(__file__).parent.parent / "models"
MODEL_FILE    = MODEL_DIR / "priority_model.pkl"

# ── DB helpers ────────────────────────────────────────────────────────────────

def _get_conn():
    """Build a synchronous psycopg2 connection from DATABASE_URL in .env."""
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        log.error("DATABASE_URL not set in .env")
        sys.exit(1)
    # Strip SQLAlchemy dialect prefix (postgresql+asyncpg:// → postgresql://)
    url = raw.replace("postgresql+asyncpg://", "postgresql://")
    log.info("Connecting to database …")
    return psycopg2.connect(url)


# ── Engagement curve helpers ──────────────────────────────────────────────────

def _linkedin_engagement(dt: datetime) -> tuple[float, int]:
    """LinkedIn: peaks weekday mornings and early evenings."""
    dow   = dt.weekday()   # 0=Mon … 6=Sun
    hour  = dt.hour
    is_weekday = dow < 5

    if not is_weekday:
        rate  = random.gauss(0.012, 0.003)
        reach = int(random.gauss(400, 100))
    elif 7 <= hour <= 9:     # early morning commute spike
        rate  = random.gauss(0.075, 0.015)
        reach = int(random.gauss(4200, 600))
    elif 11 <= hour <= 13:   # lunch scroll
        rate  = random.gauss(0.045, 0.010)
        reach = int(random.gauss(2500, 400))
    elif 17 <= hour <= 19:   # after-work spike
        rate  = random.gauss(0.068, 0.012)
        reach = int(random.gauss(3800, 500))
    elif 9 <= hour <= 17:    # normal business hours — moderate
        rate  = random.gauss(0.030, 0.008)
        reach = int(random.gauss(1800, 300))
    else:                    # night / very early morning
        rate  = random.gauss(0.010, 0.003)
        reach = int(random.gauss(300, 80))

    rate  = max(0.0, round(rate, 5))
    reach = max(0, reach)
    return rate, reach


def _youtube_engagement(dt: datetime) -> tuple[float, int]:
    """YouTube: afternoon/evening; stronger Thu-Sun (leisure viewing)."""
    dow    = dt.weekday()
    hour   = dt.hour
    is_wkd = dow >= 3   # Thu=3 … Sun=6

    if 14 <= hour <= 18:    # afternoon peak
        rate  = random.gauss(0.072 if is_wkd else 0.050, 0.014)
        reach = int(random.gauss(28000 if is_wkd else 18000, 4000))
    elif 19 <= hour <= 22:  # prime-time evening
        rate  = random.gauss(0.060 if is_wkd else 0.042, 0.012)
        reach = int(random.gauss(22000 if is_wkd else 14000, 3500))
    elif 9 <= hour <= 13:   # morning — moderate
        rate  = random.gauss(0.025, 0.008)
        reach = int(random.gauss(9000, 2000))
    else:                   # night / early AM
        rate  = random.gauss(0.010, 0.004)
        reach = int(random.gauss(3000, 700))

    rate  = max(0.0, round(rate, 5))
    reach = max(0, reach)
    return rate, reach


def _reddit_engagement(dt: datetime) -> tuple[float, int]:
    """Reddit: weekday morning spike; evening spike every day."""
    dow   = dt.weekday()
    hour  = dt.hour
    is_weekday = dow < 5

    if 9 <= hour <= 11 and is_weekday:   # morning US East
        rate  = random.gauss(0.065, 0.014)
        reach = int(random.gauss(2200, 400))
    elif 7 <= hour <= 9 and is_weekday:  # pre-work scroll
        rate  = random.gauss(0.048, 0.010)
        reach = int(random.gauss(1500, 300))
    elif 19 <= hour <= 22:               # evening across time zones
        rate  = random.gauss(0.055, 0.012)
        reach = int(random.gauss(1900, 350))
    elif 12 <= hour <= 15:               # lunch
        rate  = random.gauss(0.035, 0.008)
        reach = int(random.gauss(1200, 250))
    else:
        rate  = random.gauss(0.018, 0.005)
        reach = int(random.gauss(500, 120))

    rate  = max(0.0, round(rate, 5))
    reach = max(0, reach)
    return rate, reach


CURVE = {
    "linkedin": _linkedin_engagement,
    "youtube":  _youtube_engagement,
    "reddit":   _reddit_engagement,
}

# ── Step 1: Seed audience_patterns ────────────────────────────────────────────

def seed_audience_patterns(conn) -> None:
    log.info("=" * 60)
    log.info("STEP 1 — Seeding audience_patterns (%d days × %d platforms)",
             SEED_DAYS, len(PLATFORMS))

    from psycopg2.extras import execute_values  # single-round-trip bulk insert

    now   = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = now - timedelta(days=SEED_DAYS)

    # Every 2 hours to keep row count and upload time reasonable
    # 90 days × 12 rows/day = 1 080 rows per platform (still >> 50 threshold)
    slots = [start + timedelta(hours=h) for h in range(0, SEED_DAYS * 24, 2)]
    log.info("  %d time slots to insert per platform", len(slots))

    cur = conn.cursor()

    # Remove any existing synthetic rows for demo user to allow re-runs
    cur.execute(
        "DELETE FROM audience_patterns WHERE user_id = %s",
        (DEMO_USER_ID,)
    )
    deleted = cur.rowcount
    if deleted:
        log.info("  Cleared %d stale rows", deleted)
    conn.commit()

    for platform in PLATFORMS:
        fn   = CURVE[platform]
        rows = []
        for slot in slots:
            rate, reach = fn(slot)
            rows.append((
                DEMO_USER_ID,
                platform,
                slot,
                rate,
                reach,
                int(reach * rate),  # interactions ≈ reach × rate
            ))

        log.info("  Inserting %d rows for %-10s …", len(rows), platform)
        # execute_values sends the whole batch in one SQL statement — much faster
        execute_values(
            cur,
            """
            INSERT INTO audience_patterns
                (user_id, platform, time_slot, engagement_rate, reach, interactions)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            page_size=1000,
        )
        conn.commit()
        log.info(
            "  ✓ %-10s  %4d rows  (avg engagement %.3f%%)",
            platform,
            len(rows),
            100 * float(np.mean([r[3] for r in rows])),
        )

    cur.close()
    log.info("Seed complete — TimingEngine can now use Prophet instead of defaults.")


# ── Step 2: Train LightGBM PriorityCalculator ────────────────────────────────

CONTENT_TYPE_MAP = {"text": 0, "image": 1, "video": 2, "carousel": 3}

def _generate_priority_dataset(n: int = 3000) -> tuple[np.ndarray, np.ndarray]:
    """
    Synthesise labelled (X, y) arrays for the PriorityCalculator.

    Features (6 columns):
      0  content_type      int  0-3
      1  is_time_sensitive int  0/1
      2  is_evergreen      int  0/1
      3  hour_of_day       int  0-23
      4  day_of_week       int  0-6
      5  platform_count    int  1-6

    Label y=1 means "publish soon (high priority)".

    Labelling heuristic (reflects real editorial logic):
      - time_sensitive alone gives high priority
      - is_evergreen lowers priority
      - posting at peak hours raises priority
      - more platforms → slightly higher priority (broadcast value)
    """
    rng = np.random.default_rng(42)

    content_types  = rng.integers(0, 4, size=n)
    time_sensitive = rng.integers(0, 2, size=n)
    evergreen      = rng.integers(0, 2, size=n)
    hours          = rng.integers(0, 24, size=n)
    days           = rng.integers(0, 7, size=n)
    platform_counts = rng.integers(1, 7, size=n)

    # Peak hours for any platform: 7-10, 12-14, 17-21
    is_peak_hour = ((hours >= 7) & (hours <= 10)) | \
                   ((hours >= 12) & (hours <= 14)) | \
                   ((hours >= 17) & (hours <= 21))
    is_weekday   = days < 5

    # Priority score (deterministic rule, no noise yet)
    score = (
        time_sensitive * 0.5 +
        (1 - evergreen)  * 0.15 +
        is_peak_hour.astype(int) * 0.20 +
        is_weekday.astype(int) * 0.05 +
        (platform_counts / 6) * 0.10
    )

    # Add 10% Gaussian noise, then threshold at 0.5
    score += rng.normal(0, 0.06, size=n)
    y = (score >= 0.5).astype(int)

    X = np.column_stack([
        content_types, time_sensitive, evergreen,
        hours, days, platform_counts,
    ])
    return X.astype(float), y


def train_priority_model() -> None:
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, roc_auc_score

    log.info("=" * 60)
    log.info("STEP 2 — Training LightGBM PriorityCalculator")

    X, y = _generate_priority_dataset(n=3000)
    log.info("  Dataset: %d samples, %d features, %.1f%% positive class",
             len(X), X.shape[1], 100 * y.mean())

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = lgb.LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=31,
        min_child_samples=20,
        random_state=42,
        verbose=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(30, verbose=False)],
    )

    preds      = model.predict(X_test)
    proba      = model.predict_proba(X_test)[:, 1]
    accuracy   = accuracy_score(y_test, preds)
    auc        = roc_auc_score(y_test, proba)

    log.info("  Val accuracy : %.3f", accuracy)
    log.info("  Val ROC-AUC  : %.3f", auc)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(model, f)
    log.info("  ✓ Model saved → %s", MODEL_FILE)
    log.info("  PriorityCalculator will now use LightGBM (no more rule-based fallback).")


# ── Step 3: Prophet smoke-test ────────────────────────────────────────────────

def prophet_smoke_test(conn) -> None:
    """Run a Prophet forecast on each platform's seeded data."""
    log.info("=" * 60)
    log.info("STEP 3 — Prophet smoke-test (best posting time per platform)")

    try:
        from prophet import Prophet
    except Exception as e:
        log.warning("  Could not import Prophet: %s — skipping smoke-test.", e)
        _print_prophet_fix()
        return

    # Quick check: can Prophet instantiate?
    try:
        _p = Prophet()  # noqa: F841
    except Exception as init_err:
        log.warning("  Prophet could not initialise (%s).", init_err)
        log.warning("  The TimingEngine will fall back to industry-default times.")
        log.warning("  To fix: pip install pystan==3.10.0  (or install CmdStan via cmdstanpy)")
        _print_prophet_fix()
        return

    cur = conn.cursor()

    for platform in PLATFORMS:
        cur.execute(
            """
            SELECT time_slot, engagement_rate
            FROM   audience_patterns
            WHERE  user_id = %s
              AND  platform = %s
              AND  time_slot >= NOW() - INTERVAL '14 days'
            ORDER  BY time_slot
            """,
            (DEMO_USER_ID, platform),
        )
        rows = cur.fetchall()
        if not rows:
            log.warning("  %s — no rows found, skipping.", platform)
            continue

        try:
            df = pd.DataFrame(rows, columns=["ds", "y"])
            df["ds"] = pd.to_datetime(df["ds"])
            df["y"]  = df["y"].clip(lower=0)

            m = Prophet(daily_seasonality=True, weekly_seasonality=True,
                        yearly_seasonality=False)
            m.fit(df)

            future    = m.make_future_dataframe(periods=7 * 24, freq="h")
            forecast  = m.predict(future)

            now       = datetime.utcnow()
            future_fc = forecast[forecast["ds"] > now].copy()
            future_fc = future_fc[future_fc["ds"].dt.hour.between(6, 22)]

            if platform == "linkedin":
                future_fc = future_fc[future_fc["ds"].dt.dayofweek < 5]

            if future_fc.empty:
                log.warning("  %s — no valid future slots after filtering.", platform)
                continue

            top = future_fc.nlargest(1, "yhat").iloc[0]
            dt  = top["ds"].to_pydatetime()
            log.info(
                "  ✓ %-10s  best slot → %s  (score=%.4f)",
                platform,
                dt.strftime("%A %b %d %H:%M UTC"),
                float(top["yhat"]),
            )

        except Exception as e:
            log.warning("  %s — Prophet fit failed: %s", platform, e)

    cur.close()


def _print_prophet_fix() -> None:
    log.info("")
    log.info("  ─── Prophet status ───────────────────────────────────────────")
    log.info("  The seeded data IS in the DB. Once Prophet's Stan backend is")
    log.info("  installed, TimingEngine will use ML forecasts automatically.")
    log.info("  Fix: activate venv then run:")
    log.info("    pip install pystan==3.10.0")
    log.info("  ──────────────────────────────────────────────────────────────")
    log.info("")

# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    random.seed(0)
    np.random.seed(0)

    log.info("ORBIT ML Training Bootstrap")
    log.info("Demo user : %s", DEMO_USER_ID)
    log.info("Model dir : %s", MODEL_DIR.resolve())

    conn = _get_conn()
    log.info("Connected.")

    try:
        seed_audience_patterns(conn)
        train_priority_model()
        prophet_smoke_test(conn)
    finally:
        conn.close()

    log.info("=" * 60)
    log.info("All done.  Restart the backend (uvicorn) to reload the new model.")
    log.info("  /api/v1/schedule/optimal-time?user_id=%s&platform=linkedin", DEMO_USER_ID)


if __name__ == "__main__":
    main()
