import json
from io import BytesIO

from urllib.request import Request

from training.api_client import ApiClient
from training.config import WorkerSettings


class FakeResponse(BytesIO):
    status = 200


def test_artifact_upload_streams_model_to_authenticated_api(monkeypatch, tmp_path):
    settings = WorkerSettings(
        api_url="https://api.example.test/api/v1",
        api_key="worker-key",
        dataset_storage_dir=tmp_path / "datasets",
        model_storage_dir=tmp_path / "models",
        poll_interval_seconds=1,
    )
    artifact = tmp_path / "model.keras"
    artifact.write_bytes(b"keras-model")
    response_body = json.dumps(
        {
            "artifact_path": "models/owner/job-123.keras",
            "checksum": "a" * 64,
            "size_bytes": 11,
        }
    ).encode("utf-8")
    captured = {}

    def open_url(request, timeout):
        assert isinstance(request, Request)
        captured["request"] = request
        captured["timeout"] = timeout
        captured["body"] = b"".join(request.data)
        return FakeResponse(response_body)

    monkeypatch.setattr("training.api_client.urlopen", open_url)

    result = ApiClient(settings).upload_artifact("job-123", artifact)

    assert result["artifact_path"] == "models/owner/job-123.keras"
    request = captured["request"]
    assert request.full_url == (
        "https://api.example.test/api/v1/training-jobs/job-123/artifact"
    )
    assert request.get_method() == "POST"
    assert request.get_header("Authorization") == "******"
    assert request.get_header("X-worker-api-key") == "worker-key"
    assert request.get_header("Content-type") == "application/octet-stream"
    assert request.get_header("Content-length") == str(artifact.stat().st_size)
    assert captured["timeout"] == 300
    assert captured["body"] == b"keras-model"
