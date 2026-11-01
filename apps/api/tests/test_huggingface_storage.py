from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.core import huggingface_storage


def make_settings():
    return SimpleNamespace(
        hf_token="test-token",
        hf_dataset_repo_id="Nagumo55/Redes_Neuronales",
    )


def test_upload_file_uses_private_dataset_repository(tmp_path):
    source = tmp_path / "dataset.csv"
    source.write_text("x,label\n1,0\n", encoding="utf-8")
    api = Mock()

    with patch("app.core.huggingface_storage._api", return_value=api):
        huggingface_storage.upload_file(
            source, "owner/dataset.csv", make_settings()
        )

    api.upload_file.assert_called_once_with(
        path_or_fileobj=str(source),
        path_in_repo="owner/dataset.csv",
        repo_id="Nagumo55/Redes_Neuronales",
        repo_type="dataset",
        commit_message="Subir dataset de NeuroLab",
    )


def test_download_file_copies_from_hub_cache(tmp_path):
    cached_file = tmp_path / "cached.csv"
    cached_file.write_text("x,label\n1,0\n", encoding="utf-8")
    destination = tmp_path / "download" / "dataset.csv"

    with patch(
        "app.core.huggingface_storage.hf_hub_download",
        return_value=str(cached_file),
    ) as download:
        huggingface_storage.download_file(
            "owner/dataset.csv", destination, make_settings()
        )

    download.assert_called_once_with(
        repo_id="Nagumo55/Redes_Neuronales",
        filename="owner/dataset.csv",
        repo_type="dataset",
        token="test-token",
    )
    assert destination.read_text(encoding="utf-8") == "x,label\n1,0\n"


def test_delete_file_removes_file_from_dataset_repository():
    api = Mock()

    with patch("app.core.huggingface_storage._api", return_value=api):
        huggingface_storage.delete_file("owner/dataset.csv", make_settings())

    api.delete_file.assert_called_once_with(
        path_in_repo="owner/dataset.csv",
        repo_id="Nagumo55/Redes_Neuronales",
        repo_type="dataset",
        commit_message="Eliminar dataset de NeuroLab",
    )


def test_partial_configuration_is_rejected():
    settings = SimpleNamespace(hf_token="test-token", hf_dataset_repo_id=None)

    try:
        huggingface_storage.is_configured(settings)
    except RuntimeError as error:
        assert "HF_TOKEN y HF_DATASET_REPO_ID" in str(error)
    else:
        raise AssertionError("La configuración incompleta debió rechazarse.")
