from sqlalchemy.engine import make_url

from app.core.config import Settings


def test_session_pooler_components_create_encoded_ssl_url():
    settings = Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
        db_host="pooler.example.supabase.com",
        db_port=5432,
        db_database="postgres",
        db_username="postgres.test-project",
        db_password="p@ss:/? #word",
    )

    url = make_url(settings.sqlalchemy_database_url)

    assert url.drivername == "postgresql+psycopg"
    assert url.host == "pooler.example.supabase.com"
    assert url.port == 5432
    assert url.database == "postgres"
    assert url.username == "postgres.test-project"
    assert url.password == "p@ss:/? #word"
    assert url.query["sslmode"] == "require"


def test_database_url_remains_supported_as_fallback():
    settings = Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
        database_url="sqlite+pysqlite:///:memory:",
    )

    assert settings.sqlalchemy_database_url == "sqlite+pysqlite:///:memory:"
