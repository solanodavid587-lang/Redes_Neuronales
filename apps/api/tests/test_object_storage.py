from unittest.mock import Mock, patch

from app.core.config import Settings
from app.core.object_storage import delete_file, upload_file


def make_settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://test-project.supabase.co",
        s3_bucket="test-bucket",
    )


def test_upload_file_sends_path_and_key_to_bucket(tmp_path):
    source = tmp_path / "dataset.csv"
    source.write_text("label,value\n1,0.5")
    client = Mock()

    with patch("app.core.object_storage._client", return_value=client):
        upload_file(source, "datasets/test/dataset.csv", make_settings())

    client.upload_file.assert_called_once_with(
        str(source), "test-bucket", "datasets/test/dataset.csv"
    )


def test_delete_file_removes_key_from_bucket():
    client = Mock()

    with patch("app.core.object_storage._client", return_value=client):
        delete_file("datasets/test/dataset.csv", make_settings())

    client.delete_object.assert_called_once_with(
        Bucket="test-bucket", Key="datasets/test/dataset.csv"
    )
