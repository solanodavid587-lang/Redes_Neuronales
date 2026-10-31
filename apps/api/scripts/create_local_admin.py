import sys
from getpass import getpass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.passwords import hash_password
from app.db.models import User
from app.db.session import SessionLocal

DEFAULT_EMAIL = "solanodavid587@gmail.com"


def main() -> int:
    email = input(f"Correo del usuario administrador [{DEFAULT_EMAIL}]: ").strip()
    email = (email or DEFAULT_EMAIL).lower()
    password = getpass("Contraseña (entrada oculta): ")
    if len(password) < 8:
        print("La contraseña debe tener al menos 8 caracteres.", file=sys.stderr)
        return 1
    confirmation = getpass("Confirma la contraseña: ")
    if password != confirmation:
        print("Las contraseñas no coinciden.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        account = db.scalar(select(User).where(User.email == email))
        if account:
            print("Ya existe una cuenta con ese correo; no se modificó.")
            return 1
        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                role="ADMIN",
                is_active=True,
            )
        )
        db.commit()

    print(f"Cuenta administradora creada: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
