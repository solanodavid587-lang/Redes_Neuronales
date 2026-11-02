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
