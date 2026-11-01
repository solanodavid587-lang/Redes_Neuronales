from functools import lru_cache
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config

from app.core.config import Settings, get_settings


@lru_cache
def _client(
    endpoint_url: str | None,
    region: str,
    access_key_id: str | None,
    secret_access_key: str | None,
) -> Any:
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        region_name=region,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        config=Config(s3={"addressing_style": "path"}),
    )


def is_object_storage_configured(settings: Settings | None = None) -> bool:
    return bool(getattr(settings or get_settings(), "s3_bucket", None))


def upload_file(path: Path, key: str, settings: Settings | None = None) -> None:
    configured = settings or get_settings()
    if not configured.s3_bucket:
        raise RuntimeError("S3_BUCKET no está configurado.")
    _client(
        configured.s3_endpoint_url,
        configured.s3_region,
        configured.s3_access_key_id,
        configured.s3_secret_access_key,
    ).upload_file(str(path), configured.s3_bucket, key)


def download_file(key: str, destination: Path, settings: Settings | None = None) -> None:
    configured = settings or get_settings()
    if not configured.s3_bucket:
        raise RuntimeError("S3_BUCKET no está configurado.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    _client(
        configured.s3_endpoint_url,
        configured.s3_region,
        configured.s3_access_key_id,
        configured.s3_secret_access_key,
    ).download_file(configured.s3_bucket, key, str(destination))


def delete_file(key: str, settings: Settings | None = None) -> None:
    configured = settings or get_settings()
    if not configured.s3_bucket:
        raise RuntimeError("S3_BUCKET no está configurado.")
    _client(
        configured.s3_endpoint_url,
        configured.s3_region,
        configured.s3_access_key_id,
        configured.s3_secret_access_key,
    ).delete_object(Bucket=configured.s3_bucket, Key=key)
