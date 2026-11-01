from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str | None = None
    db_host: str | None = None
    db_port: int = 5432
    db_database: str | None = None
    db_username: str | None = None
    db_password: str | None = None
    dataset_storage_dir: Path = Path("data/datasets")
    supabase_url: str
    supabase_jwt_secret: str | None = None
    auth_token_secret: str | None = None
    worker_api_key: str | None = None
    s3_bucket: str | None = None
    s3_region: str = "us-east-1"
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    hf_token: str | None = None
    hf_dataset_repo_id: str | None = None
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def supabase_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def sqlalchemy_database_url(self) -> str:
        parts = {
            "DB_HOST": self.db_host,
            "DB_DATABASE": self.db_database,
            "DB_USERNAME": self.db_username,
            "DB_PASSWORD": self.db_password,
        }
        if not any(parts.values()) and self.database_url:
            return self.database_url

        missing = [name for name, value in parts.items() if not value]
        if missing:
            raise ValueError(
                "Configura DATABASE_URL o todas estas variables de conexión: "
                + ", ".join(missing)
            )

        return URL.create(
            "postgresql+psycopg",
            username=self.db_username,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_database,
            query={"sslmode": "require"},
        ).render_as_string(hide_password=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
