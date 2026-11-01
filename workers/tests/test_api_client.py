from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request

from training.api_client import ApiClient
from training.config import WorkerSettings


def test_download_dataset_streams_authenticated_api_response(tmp_path):
    settings = WorkerSettings(
        api_url="https://api.example.test/api/v1",
        api_key="worker-key",
        dataset_storage_dir=tmp_path / "datasets",
        model_storage_dir=tmp_path / "models",
        poll_interval_seconds=1,
    )
    destination = tmp_path / "temporary" / "dataset.csv"
    response = BytesIO(b"feature,label\n1,0\n")

    with patch("training.api_client.urlopen", return_value=response) as open_url:
        ApiClient(settings).download_dataset("dataset-123", destination)

    request = open_url.call_args.args[0]
    assert isinstance(request, Request)
    assert request.full_url == (
        "https://api.example.test/api/v1/datasets/worker/dataset-123/download"
    )
    assert request.get_header("Authorization") == "Bearer worker-key"
    assert destination.read_bytes() == b"feature,label\n1,0\n"
