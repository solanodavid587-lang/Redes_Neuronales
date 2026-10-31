from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.passwords import hash_password
from app.db.models import User
from app.db.session import engine


def test_admin_can_create_users_but_engineer_cannot(client):
    with Session(engine) as db:
        db.add_all(
            [
                User(
                    email="admin@example.com",
                    password_hash=hash_password("strong-admin-password"),
                    role="ADMIN",
                ),
                User(
                    email="engineer@example.com",
                    password_hash=hash_password("strong-engineer-password"),
                    role="AI_ENGINEER",
                ),
            ]
        )
        db.commit()

    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "strong-admin-password"},
    ).json()
    engineer_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "engineer@example.com",
            "password": "strong-engineer-password",
        },
    ).json()
    client.app.dependency_overrides.pop(get_current_user, None)

    denied = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {engineer_login['access_token']}"},
    )
    assert denied.status_code == 403
    denied_audit = client.get(
        "/api/v1/audit",
        headers={"Authorization": f"Bearer {engineer_login['access_token']}"},
    )
    assert denied_audit.status_code == 403

    headers = {"Authorization": f"Bearer {admin_login['access_token']}"}
    created = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "reviewer@example.com",
            "password": "a-strong-password-123",
            "role": "REVIEWER",
        },
    )
    assert created.status_code == 201
    assert created.json()["role"] == "REVIEWER"
    assert "password_hash" not in created.json()

    accounts = client.get("/api/v1/auth/users", headers=headers)
    assert accounts.status_code == 200
    assert {item["email"] for item in accounts.json()["items"]} == {
        "admin@example.com",
        "engineer@example.com",
        "reviewer@example.com",
    }


def test_local_login_returns_token_and_authenticates_user(client):
    with Session(engine) as db:
        db.add(
            User(
                email="owner@example.com",
                password_hash=hash_password("strong-test-password"),
                role="ADMIN",
            )
        )
        db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "OWNER@example.com", "password": "strong-test-password"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["user"]["email"] == "owner@example.com"
    assert result["user"]["role"] == "ADMIN"
    assert result["token_type"] == "bearer"

    client.app.dependency_overrides.pop(get_current_user, None)
    profile = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {result['access_token']}"},
    )
    assert profile.status_code == 200
    assert profile.json() == result["user"]


def test_local_login_rejects_invalid_password(client):
    with Session(engine) as db:
        db.add(
            User(
                email="owner@example.com",
                password_hash=hash_password("strong-test-password"),
                role="ADMIN",
            )
        )
        db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Correo o contraseña incorrectos."
