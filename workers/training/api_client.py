import json
from pathlib import Path
import shutil
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from training.config import WorkerSettings


class ApiClientError(RuntimeError):
    pass


class ApiClient:
    def __init__(self, settings: WorkerSettings):
        self.settings = settings

    def request(
        self, method: str, path: str, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            f"{self.settings.api_url}/{path.lstrip('/')}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.settings.api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                body = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise ApiClientError(
                f"La API respondió {error.code}: {detail[:500]}"
            ) from error
        except (TimeoutError, URLError) as error:
            raise ApiClientError(f"No se pudo comunicar con la API: {error}") from error
        if not body:
            return {}
        decoded = json.loads(body)
        if not isinstance(decoded, dict):
            raise ApiClientError("La API devolvió una respuesta inesperada.")
        return decoded

    def download_dataset(self, dataset_id: str, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        request = Request(
            f"{self.settings.api_url}/datasets/worker/{dataset_id}/download",
            method="GET",
            headers={"Authorization": f"Bearer {self.settings.api_key}"},
        )
        try:
            with urlopen(request, timeout=120) as response:
                with destination.open("wb") as target:
                    shutil.copyfileobj(response, target)
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            destination.unlink(missing_ok=True)
            raise ApiClientError(
                f"La API respondió {error.code} al descargar el dataset: {detail[:500]}"
            ) from error
        except (OSError, TimeoutError, URLError) as error:
            destination.unlink(missing_ok=True)
            raise ApiClientError(
                f"No se pudo descargar el dataset desde la API: {error}"
            ) from error

    def claim(self, job_id: str | None = None) -> dict[str, Any] | None:
        path = "/training-jobs/worker/claim"
        if job_id is not None:
            path = f"{path}?{urlencode({'job_id': job_id})}"
        response = self.request("POST", path, {})
        job = response.get("job")
        if job is not None and not isinstance(job, dict):
            raise ApiClientError("La API devolvió un trabajo con formato inválido.")
        return job

    def upload_artifact(self, job_id: str, source: Path) -> dict[str, Any]:
        request = Request(
            f"{self.settings.api_url}/training-jobs/{job_id}/artifact",
            method="POST",
            headers={
                "Authorization": f"******",
                "Content-Type": "application/octet-stream",
                "Content-Length": str(source.stat().st_size),
            },
        )
        try:
            with source.open("rb") as artifact:
                request.data = iter(lambda: artifact.read(1024 * 1024), b"")
                request.add_header("Content-Length", str(source.stat().st_size))
                with urlopen(request, timeout=300) as response:
                    body = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise ApiClientError(
                f"La API respondió {error.code} al guardar el modelo: {detail[:500]}"
            ) from error
        except (OSError, TimeoutError, URLError) as error:
            raise ApiClientError(
                f"No se pudo cargar el modelo a la API: {error}"
            ) from error

        try:
            decoded = json.loads(body)
        except json.JSONDecodeError as error:
            raise ApiClientError("La API devolvió una respuesta inválida al guardar el modelo.") from error
        if not isinstance(decoded, dict):
            raise ApiClientError("La API devolvió una respuesta inesperada al guardar el modelo.")
        return decoded

    def publish_metric(self, job_id: str, payload: dict[str, Any]) -> None:
        self.request("POST", f"/training-jobs/{job_id}/metrics", payload)

    def complete(self, job_id: str, payload: dict[str, Any]) -> None:
        self.request("POST", f"/training-jobs/{job_id}/complete", payload)

    def fail(self, job_id: str, message: str) -> None:
        self.request(
            "POST",
            f"/training-jobs/{job_id}/fail",
            {"error": message[:2000]},
        )
