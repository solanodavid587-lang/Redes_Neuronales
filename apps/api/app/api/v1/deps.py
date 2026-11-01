import hmac
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import User
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token de acceso de NeuroLab.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    secret = get_settings().auth_token_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La autenticación del backend no está configurada.",
        )
    try:
        claims = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=["HS256"],
            audience="neurolab",
            issuer="neurolab-api",
        )
    except PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de acceso no es válido o ha expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token no contiene un identificador de usuario.",
        )
    account = db.get(User, str(claims["sub"]))
    if account is None or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta no existe o está desactivada.",
        )
    return {**claims, "email": account.email, "role": account.role}


def get_user_id(user: dict[str, Any]) -> str:
    return str(user["sub"])


def get_user_email(user: dict[str, Any]) -> str:
    return str(user.get("email", ""))


def require_admin(
    claims: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    account = db.get(User, get_user_id(claims))
    if account is None or not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta no existe o está desactivada.",
        )
    if account.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol ADMIN para esta operación.",
        )
    return {**claims, "email": account.email, "role": account.role}


def require_roles(*allowed_roles: str):
    def dependency(
        claims: dict[str, Any] = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> dict[str, Any]:
        account = db.get(User, get_user_id(claims))
        if account is None or not account.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La cuenta no existe o está desactivada.",
            )
        if account.role != "ADMIN" and account.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu rol no tiene permiso para realizar esta operación.",
            )
        return {**claims, "email": account.email, "role": account.role}

    return dependency


def require_worker(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> None:
    expected = get_settings().worker_api_key
    if (
        credentials is None
        or not expected
        or not hmac.compare_digest(credentials.credentials, expected)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere una credencial válida del worker.",
            headers={"WWW-Authenticate": "Bearer"},
        )
