from pathlib import Path
from unittest.mock import Mock, patch

from training.config import WorkerSettings
from training.object_storage import download_file, upload_file


def make_settings() -> WorkerSettings:
    return WorkerSettings(
        api_url="https://api.example.test/api/v1",
        api_key="test-key",
        dataset_storage_dir=Path("datasets"),
        model_storage_dir=Path("artifacts"),
        poll_interval_seconds=3,
        s3_bucket="test-bucket",
    )


def test_download_file_uses_bucket_key_and_destination(tmp_path):
    destination = tmp_path / "dataset.csv"
    client = Mock()

    with patch("training.object_storage.boto3.client", return_value=client) as create_client:
        download_file(make_settings(), "datasets/test/dataset.csv", destination)

    client.download_file.assert_called_once_with(
        "test-bucket", "datasets/test/dataset.csv", str(destination)
    )
    assert create_client.call_args.kwargs["config"].s3["addressing_style"] == "path"
    assert destination.parent.is_dir()


def test_upload_file_uses_bucket_key_and_source(tmp_path):
    source = tmp_path / "model.keras"
    source.write_bytes(b"model")
    client = Mock()

    with patch("training.object_storage.boto3.client", return_value=client):
        upload_file(make_settings(), source, "models/test/model.keras")

    client.upload_file.assert_called_once_with(
        str(source), "test-bucket", "models/test/model.keras"
    )
