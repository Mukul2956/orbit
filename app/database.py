from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


# ─── AsyncEngine ─────────────────────────────────────────────────────────────
# Supabase uses PgBouncer in *transaction* pooling mode (port 6543).
# Transaction pooling reassigns the underlying Postgres connection after every
# transaction, so SQLAlchemy's own connection pool must be disabled (NullPool)
# and asyncpg's prepared-statement cache must be set to 0 — otherwise asyncpg
# tries to reuse a named prepared statement that no longer belongs to this
# Postgres backend and throws DuplicatePreparedStatementError.
engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    echo=(settings.ENVIRONMENT == "development"),
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
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
