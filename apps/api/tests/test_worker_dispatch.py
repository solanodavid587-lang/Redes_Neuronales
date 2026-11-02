import hashlib
from types import SimpleNamespace

import app.api.v1.deps as dependencies
from app.api.v1.endpoints import resources


def _create_queued_job(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "worker.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Worker dispatch",
            "objective": "Probar trabajos de GitHub Actions",
            "datasetId": dataset["id"],
            "modelFamily": "CNN",
        },
    ).json()
    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "Worker dispatch CNN",
            "family": "CNN",
            "inputShape": [2, 2, 1],
            "layers": [
                {"id": "input", "type": "Input", "neurons": 1, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 4, "activation": "relu"},
                {"id": "output", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    ).json()
    response = client.post(
        "/api/v1/training-jobs",
        json={
            "projectId": project["id"],
            "datasetId": dataset["id"],
            "architectureId": architecture["id"],
            "totalEpochs": 1,
            "configuration": {"loss": "binary_crossentropy"},
        },
    )
    assert response.status_code == 202
    return response.json()["id"]


def _configure_worker_auth(monkeypatch):
    worker_key = "worker-test-key"
    monkeypatch.setattr(
        dependencies,
        "get_settings",
        lambda: SimpleNamespace(worker_api_key=worker_key),
    )
    return {"Authorization": f"Bearer {worker_key}"}


def test_worker_claim_can_target_dispatched_job(client, monkeypatch):
    headers = _configure_worker_auth(monkeypatch)
    monkeypatch.setattr(
        resources,
        "dispatch_training_workflow",
        lambda _job_id: False,
    )
    first_job = _create_queued_job(client)
    second_job = _create_queued_job(client)

    targeted = client.post(
        f"/api/v1/training-jobs/worker/claim?job_id={second_job}",
        headers=headers,
    )
    assert targeted.status_code == 200
    assert targeted.json()["job"]["id"] == second_job

    remaining = client.post(
        "/api/v1/training-jobs/worker/claim",
        headers=headers,
    )
    assert remaining.status_code == 200
    assert remaining.json()["job"]["id"] == first_job


def test_worker_model_artifact_is_persisted_in_private_huggingface_repo(
    client, monkeypatch
):
    headers = _configure_worker_auth(monkeypatch)
    job_id = _create_queued_job(client)
    claimed = client.post(
        f"/api/v1/training-jobs/worker/claim?job_id={job_id}",
        headers=headers,
    )
    assert claimed.status_code == 200

    remote_files = {}
    settings = SimpleNamespace(
        hf_token="test-token",
        hf_dataset_repo_id="owner/private-datasets",
    )
    monkeypatch.setattr(resources, "get_settings", lambda: settings)
    monkeypatch.setattr(
        resources.huggingface_storage,
        "is_configured",
        lambda _settings: True,
    )

    def store_artifact(source, path_in_repo, configured, commit_message):
        assert configured is settings
        assert commit_message == "Guardar modelo entrenado de NeuroLab"
        remote_files[path_in_repo] = source.read_bytes()

    monkeypatch.setattr(
        resources.huggingface_storage,
        "upload_file",
        store_artifact,
    )
    content = b"keras-model-artifact"
    response = client.post(
        f"/api/v1/training-jobs/{job_id}/artifact",
        headers={**headers, "Content-Type": "application/octet-stream"},
        content=content,
    )

    assert response.status_code == 200
    uploaded = response.json()
    assert uploaded["artifact_path"].endswith(f"/{job_id}.keras")
    assert uploaded["size_bytes"] == len(content)
    assert uploaded["checksum"] == hashlib.sha256(content).hexdigest()
    assert remote_files[uploaded["artifact_path"]] == content
