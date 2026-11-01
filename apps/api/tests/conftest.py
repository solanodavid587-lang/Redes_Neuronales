import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
for database_setting in ("DB_HOST", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD"):
    os.environ[database_setting] = ""
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("AUTH_TOKEN_SECRET", "test-only-signing-secret-that-is-long-enough")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.api.v1.deps import get_current_user
from app.db.base import Base
from app.db.models import User
from app.db.session import engine, get_db
from app.main import app

TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestSession()
    db.add(
        User(
            id="test-user",
            email="test@example.com",
            password_hash="test-password-hash",
            role="ADMIN",
        )
    )
    db.commit()
    db.close()

    def override_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test-user",
        "email": "test@example.com",
        "role": "ADMIN",
        "app_metadata": {"role": "AI_ENGINEER"},
    }
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
