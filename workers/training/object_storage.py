from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config

from training.config import WorkerSettings


def _client(settings: WorkerSettings) -> Any:
    if not settings.s3_bucket:
        raise RuntimeError("S3_BUCKET no está configurado.")
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        config=Config(s3={"addressing_style": "path"}),
    )


def download_file(settings: WorkerSettings, key: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    _client(settings).download_file(settings.s3_bucket, key, str(destination))


def upload_file(settings: WorkerSettings, path: Path, key: str) -> None:
    _client(settings).upload_file(str(path), settings.s3_bucket, key)
