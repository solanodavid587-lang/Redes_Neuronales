import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorkerSettings:
    api_url: str
    api_key: str
    dataset_storage_dir: Path
    model_storage_dir: Path
    poll_interval_seconds: float
    persist_artifacts_via_api: bool = False
    s3_bucket: str | None = None
    s3_region: str = "us-east-1"
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    @classmethod
    def from_env(cls) -> "WorkerSettings":
        api_key = os.environ.get("WORKER_API_KEY", "").strip()
        if not api_key:
            raise ValueError("WORKER_API_KEY es obligatorio para iniciar el worker.")
        return cls(
            api_url=os.environ.get(
                "NEUROLAB_API_URL", "http://localhost:8000/api/v1"
            ).rstrip("/"),
            api_key=api_key,
            dataset_storage_dir=Path(
                os.environ.get("DATASET_STORAGE_DIR", "../apps/api/data/datasets")
            ).resolve(),
            model_storage_dir=Path(
                os.environ.get("MODEL_STORAGE_DIR", "./artifacts")
            ).resolve(),
            poll_interval_seconds=max(
                1.0, float(os.environ.get("WORKER_POLL_INTERVAL", "3"))
            ),
            persist_artifacts_via_api=os.environ.get(
                "PERSIST_ARTIFACTS_VIA_API", ""
            ).strip().lower() in {"1", "true", "yes"},
            s3_bucket=os.environ.get("S3_BUCKET") or None,
            s3_region=os.environ.get("S3_REGION", "us-east-1"),
            s3_endpoint_url=os.environ.get("S3_ENDPOINT_URL") or None,
            s3_access_key_id=os.environ.get("S3_ACCESS_KEY_ID") or None,
            s3_secret_access_key=os.environ.get("S3_SECRET_ACCESS_KEY") or None,
        )
