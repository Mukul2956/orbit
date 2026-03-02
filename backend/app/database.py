from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ─── AsyncEngine ─────────────────────────────────────────────────────────────
# DATABASE_URL must point at Supabase's *session* pooler (port 5432), NOT the
# PgBouncer transaction pooler (port 6543).  Transaction mode reassigns the
# underlying Postgres connection after every statement, so asyncpg's named
# prepared statements collide across requests → DuplicatePreparedStatementError.
# Session mode keeps one Postgres backend per client connection, so asyncpg
# prepared statements work correctly and SQLAlchemy pooling is safe to use.
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
    echo=(settings.ENVIRONMENT == "development"),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Base for all ORM models ────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ─── Dependency – use inside FastAPI route handlers ────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
