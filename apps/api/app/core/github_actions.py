import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import Settings, get_settings


class GitHubActionsError(RuntimeError):
    pass


def dispatch_training_workflow(
    job_id: str, settings: Settings | None = None
) -> bool:
    configured = settings or get_settings()
    token = configured.github_actions_token
    repository = configured.github_actions_repository
    if not token and not repository:
        if configured.app_env == "production":
            raise GitHubActionsError(
                "GitHub Actions no está configurado. Revisa GH_ACTIONS_TOKEN y GH_ACTIONS_REPOSITORY en Render."
            )
        return False
    if not token or not repository:
        raise GitHubActionsError(
            "Configura GH_ACTIONS_TOKEN y GH_ACTIONS_REPOSITORY para ejecutar entrenamientos en GitHub Actions."
        )

    request = Request(
        f"https://api.github.com/repos/{repository}/actions/workflows/training-worker.yml/dispatches",
        data=json.dumps(
            {"ref": "main", "inputs": {"job_id": job_id}}
        ).encode("utf-8"),
        method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            if response.status != 204:
                raise GitHubActionsError(
                    f"GitHub Actions devolvió un estado inesperado: {response.status}."
                )
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise GitHubActionsError(
            f"GitHub rechazó el inicio del entrenamiento ({error.code}): {detail[:500]}"
        ) from error
    except (TimeoutError, URLError, OSError) as error:
        raise GitHubActionsError(
            f"No se pudo iniciar el entrenamiento en GitHub Actions: {error}"
        ) from error
    return True
