from io import BytesIO
from unittest.mock import patch

from training.api_client import ApiClient
from training.config import WorkerSettings


def test_claim_targets_job_from_workflow_dispatch(tmp_path):
    settings = WorkerSettings(
        api_url="https://api.example.test/api/v1",
        api_key="worker-key",
        dataset_storage_dir=tmp_path / "datasets",
        model_storage_dir=tmp_path / "models",
        poll_interval_seconds=1,
    )
    response = BytesIO(b'{"job": null}')

    with patch("training.api_client.urlopen", return_value=response) as open_url:
        job = ApiClient(settings).claim("job-123")

    request = open_url.call_args.args[0]
    assert request.full_url == (
        "https://api.example.test/api/v1/training-jobs/worker/claim?job_id=job-123"
    )
    assert job is None


def test_worker_settings_trims_newlines_from_api_url(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKER_API_KEY", "worker-key")
    monkeypatch.setenv(
        "NEUROLAB_API_URL",
        "https://api.example.test/api/v1\r\n",
    )
    monkeypatch.setenv("DATASET_STORAGE_DIR", str(tmp_path / "datasets"))
    monkeypatch.setenv("MODEL_STORAGE_DIR", str(tmp_path / "models"))

    settings = WorkerSettings.from_env()

    assert settings.api_url == "https://api.example.test/api/v1"
