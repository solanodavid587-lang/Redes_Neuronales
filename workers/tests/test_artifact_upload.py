import json
from pathlib import Path

from training import api_client
from training.api_client import ApiClient
from training.config import WorkerSettings


class FakeResponse:
    status = 200

    def read(self):
        return json.dumps(
            {
                "artifact_path": "models/owner/job-123.keras",
                "checksum": "a" * 64,
                "size_bytes": 11,
            }
        ).encode("utf-8")


class FakeConnection:
    def __init__(self, host, port, timeout):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.headers = {}
        self.body = bytearray()

    def putrequest(self, method, path):
        self.method = method
        self.path = path

    def putheader(self, name, value):
        self.headers[name] = value

    def endheaders(self):
        pass

    def send(self, chunk):
        self.body.extend(chunk)

    def getresponse(self):
        return FakeResponse()

    def close(self):
        pass


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
    connection = None

    def create_connection(host, port, timeout):
        nonlocal connection
        connection = FakeConnection(host, port, timeout)
        return connection

    monkeypatch.setattr(api_client.http.client, "HTTPSConnection", create_connection)

    result = ApiClient(settings).upload_artifact("job-123", artifact)

    assert result["artifact_path"] == "models/owner/job-123.keras"
    assert connection.host == "api.example.test"
    assert connection.port is None
    assert connection.timeout == 300
    assert connection.method == "POST"
    assert connection.path == "/api/v1/training-jobs/job-123/artifact"
    assert connection.headers["Content-Type"] == "application/octet-stream"
    assert connection.headers["Content-Length"] == str(artifact.stat().st_size)
    assert connection.body == b"keras-model"
