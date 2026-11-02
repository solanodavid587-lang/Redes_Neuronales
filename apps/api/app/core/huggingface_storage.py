from pathlib import Path
import shutil
from typing import Any

from huggingface_hub import HfApi, hf_hub_download

from app.core.config import Settings, get_settings


def _configuration(settings: Settings | None = None) -> tuple[str, str]:
    configured = settings or get_settings()
    token = getattr(configured, "hf_token", None)
    repo_id = getattr(configured, "hf_dataset_repo_id", None)
    token = token.strip() if isinstance(token, str) else token
    repo_id = repo_id.strip() if isinstance(repo_id, str) else repo_id
    if bool(token) != bool(repo_id):
        raise RuntimeError(
            "HF_TOKEN y HF_DATASET_REPO_ID deben configurarse juntos."
        )
    if not token or not repo_id:
        raise RuntimeError("Hugging Face no está configurado.")
    return token, repo_id


def is_configured(settings: Settings | None = None) -> bool:
    configured = settings or get_settings()
    token = getattr(configured, "hf_token", None)
    repo_id = getattr(configured, "hf_dataset_repo_id", None)
    token = token.strip() if isinstance(token, str) else token
    repo_id = repo_id.strip() if isinstance(repo_id, str) else repo_id
    if bool(token) != bool(repo_id):
        raise RuntimeError(
            "HF_TOKEN y HF_DATASET_REPO_ID deben configurarse juntos."
        )
    return bool(token and repo_id)


def _api(token: str) -> Any:
    return HfApi(token=token)


def upload_file(
    source: Path,
    path_in_repo: str,
    settings: Settings | None = None,
    commit_message: str = "Subir dataset de NeuroLab",
) -> None:
    token, repo_id = _configuration(settings)
    _api(token).upload_file(
        path_or_fileobj=str(source),
        path_in_repo=path_in_repo,
        repo_id=repo_id,
        repo_type="dataset",
        commit_message=commit_message,
    )


def download_file(
    path_in_repo: str, destination: Path, settings: Settings | None = None
) -> None:
    token, repo_id = _configuration(settings)
    cached_file = hf_hub_download(
        repo_id=repo_id,
        filename=path_in_repo,
        repo_type="dataset",
        token=token,
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(cached_file, destination)


def delete_file(path_in_repo: str, settings: Settings | None = None) -> None:
    token, repo_id = _configuration(settings)
    _api(token).delete_file(
        path_in_repo=path_in_repo,
        repo_id=repo_id,
        repo_type="dataset",
        commit_message="Eliminar dataset de NeuroLab",
    )
