from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()
database_url = settings.sqlalchemy_database_url
connect_args = {}
engine_options = {"pool_pre_ping": True}

if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    if database_url.endswith(":memory:"):
        engine_options["poolclass"] = StaticPool
else:
    connect_args["sslmode"] = "require"

engine = create_engine(
    database_url,
    connect_args=connect_args,
    **engine_options,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
