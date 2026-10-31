
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_user_id, require_admin
from app.core.config import get_settings
from app.core.passwords import hash_password, verify_password
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=256)


class CreateUserRequest(BaseModel):
    email: str = Field(
        min_length=5,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    password: str = Field(min_length=12, max_length=128)
    role: str = Field(pattern="^(ADMIN|PROJECT_MANAGER|AI_ENGINEER|REVIEWER)$")


def user_output(user: User) -> dict[str, str]:
    return {"id": user.id, "email": user.email, "role": user.role}


def admin_user_output(user: User) -> dict[str, Any]:
    return {
        **user_output(user),
        "isActive": user.is_active,
        "createdAt": user.created_at.isoformat(),
    }


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    settings = get_settings()
    if not settings.auth_token_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticación del backend no está configurada.",
        )

    email = payload.email.strip().lower()
    account = db.scalar(select(User).where(User.email == email))
    if account is None or not verify_password(payload.password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada.",
        )

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": account.id,
            "email": account.email,
            "role": account.role,
            "iat": now,
            "exp": now + timedelta(hours=12),
            "iss": "neurolab-api",
            "aud": "neurolab",
        },
        settings.auth_token_secret,
        algorithm="HS256",
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_output(account),
    }


@router.get("/me")
def read_current_user(
    claims: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account = db.scalar(select(User).where(User.id == get_user_id(claims)))
    if account is None or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta no existe o está desactivada.",
        )
    return user_output(account)


@router.get("/users")
def list_users(
    _admin: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    accounts = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return {"items": [admin_user_output(account) for account in accounts]}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserRequest,
    _admin: dict[str, Any] = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    email = str(payload.email).strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo.",
        )

    account = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return admin_user_output(account)
