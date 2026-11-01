def set_user_role(role: str) -> None:
    from sqlalchemy.orm import Session

    from app.db.models import User
    from app.db.session import engine

    with Session(engine) as db:
        account = db.get(User, "test-user")
        account.role = role
        db.commit()


def create_training_job(
    client, name: str = "Prueba de eliminación"
) -> dict[str, str]:
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": f"{name}.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": name,
            "objective": "Probar eliminación administrativa",
            "datasetId": dataset["id"],
        },
    ).json()
    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": f"CNN {name}",
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 2, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu"},
                {"id": "out", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    ).json()
    job = client.post(
        "/api/v1/training-jobs",
        json={
            "projectId": project["id"],
            "datasetId": dataset["id"],
            "architectureId": architecture["id"],
            "totalEpochs": 1,
            "configuration": {
                "batchSize": 32,
                "learningRate": 0.001,
                "optimizer": "adam",
                "loss": "binary_crossentropy",
                "earlyStopping": False,
                "patience": 3,
                "seed": 1,
            },
        },
    )
    assert job.status_code == 202
    return {
        "datasetId": dataset["id"],
        "projectId": project["id"],
        "jobId": job.json()["id"],
    }


def test_health_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_checks_database(client):
    response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}


def test_projects_create_and_list(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "base.csv", "format": "CSV"},
    ).json()
    created = client.post(
        "/api/v1/projects",
        json={
            "name": "Clasificador",
            "description": "Proyecto de prueba",
            "objective": "Clasificar imágenes",
            "modelFamily": "CNN",
            "datasetId": dataset["id"],
        },
    )

    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "Clasificador"
    assert project["status"] == "ACTIVE"
    assert project["modelFamily"] == "CNN"
    assert project["objective"] == "Clasificar imágenes"
    assert project["datasetsCount"] == 1
    assert project["datasetId"] == dataset["id"]

    listed = client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == project["id"]


def test_project_requires_an_available_dataset(client):
    missing_dataset = client.post(
        "/api/v1/projects",
        json={"name": "Sin dataset"},
    )
    assert missing_dataset.status_code == 422

    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "base.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Con dataset",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
        },
    )
    assert project.status_code == 201

    reused_dataset = client.post(
        "/api/v1/projects",
        json={
            "name": "Dataset repetido",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
        },
    )
    assert reused_dataset.status_code == 409


def test_projects_datasets_and_architectures_capture_cnn_rnn_metadata(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={
            "name": "series.csv",
            "description": "Sensores de temperatura",
            "format": "CSV",
            "targetColumn": "salida",
            "featureColumns": ["temperatura", "humedad"],
            "sequenceLength": 24,
        },
    )
    assert dataset.status_code == 201
    dataset_id = dataset.json()["id"]
    assert dataset.json()["targetColumn"] == "salida"
    assert dataset.json()["featureColumns"] == ["temperatura", "humedad"]
    assert dataset.json()["sequenceLength"] == 24

    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Pronóstico",
            "objective": "Predecir valores futuros",
            "modelFamily": "RNN",
            "datasetId": dataset_id,
        },
    )
    assert project.status_code == 201
    project_id = project.json()["id"]
    assert project.json()["modelFamily"] == "RNN"
    assert project.json()["objective"] == "Predecir valores futuros"

    unsupported_family = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project_id,
            "name": "Red GAN",
            "family": "GAN",
            "layers": [],
        },
    )
    assert unsupported_family.status_code == 422

    mismatched_family = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project_id,
            "name": "CNN no permitida",
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 24, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu"},
                {"id": "out", "type": "Output", "neurons": 1, "activation": "linear"},
            ],
        },
    )
    assert mismatched_family.status_code == 409

    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project_id,
            "name": "LSTM de pronóstico",
            "family": "RNN",
            "description": "Secuencia de 24 pasos",
            "inputShape": [24, 2],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 2, "activation": "None"},
                {
                    "id": "lstm",
                    "type": "LSTM",
                    "neurons": 32,
                    "activation": "tanh",
                    "returnSequences": True,
                },
                {"id": "out", "type": "Output", "neurons": 1, "activation": "linear"},
            ],
        },
    )
    assert architecture.status_code == 201
    assert architecture.json()["inputShape"] == [24, 2]
    assert architecture.json()["layers"][1]["returnSequences"] is True
    mismatched_update = client.patch(
        f"/api/v1/architectures/{architecture.json()['id']}",
        json={
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 28, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu"},
                {"id": "out", "type": "Output", "neurons": 1, "activation": "linear"},
            ],
        },
    )
    assert mismatched_update.status_code == 409
    changed_family = client.patch(
        f"/api/v1/projects/{project_id}",
        json={"modelFamily": "CNN"},
    )
    assert changed_family.status_code == 409

    updated_dataset = client.patch(
        f"/api/v1/datasets/{dataset_id}",
        json={
            "description": "Serie normalizada",
            "targetColumn": "demanda",
            "featureColumns": ["temperatura", "humedad"],
            "sequenceLength": 48,
        },
    )
    assert updated_dataset.status_code == 200
    assert updated_dataset.json()["description"] == "Serie normalizada"
    assert updated_dataset.json()["targetColumn"] == "demanda"
    assert updated_dataset.json()["sequenceLength"] == 48


def test_dataset_rejects_target_as_feature(client):
    response = client.post(
        "/api/v1/datasets",
        json={
            "name": "invalid.csv",
            "format": "CSV",
            "targetColumn": "label",
            "featureColumns": ["label", "value"],
        },
    )
    assert response.status_code == 422


def test_role_permissions_are_enforced_by_api(client):
    set_user_role("AI_ENGINEER")

    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "ingenieria.csv", "format": "CSV"},
    )
    assert dataset.status_code == 201
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Sin permiso",
            "objective": "Clasificar muestras",
            "datasetId": dataset.json()["id"],
        },
    )
    assert project.status_code == 403

    set_user_role("REVIEWER")

    upload = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("revisor.csv", b"a,b\n1,2\n", "text/csv")},
    )
    assert upload.status_code == 403


def test_dataset_update_and_protected_delete(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "original.csv", "format": "CSV"},
    ).json()
    updated = client.patch(
        f"/api/v1/datasets/{dataset['id']}",
        json={"name": "actualizado.csv", "trainSplit": 0.7, "valSplit": 0.3},
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "actualizado.csv"
    assert updated.json()["trainSplit"] == 0.7
    assert updated.json()["valSplit"] == 0.3
    assert client.delete(f"/api/v1/datasets/{dataset['id']}").status_code == 204


def test_reviewer_can_approve_but_not_create_model(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "modelo.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Revisión",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
        },
    ).json()
    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "CNN",
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 2, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu"},
                {"id": "out", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    ).json()
    model = client.post(
        "/api/v1/model-versions",
        json={
            "projectId": project["id"],
            "architectureId": architecture["id"],
            "name": "modelo",
            "version": "1.0",
            "format": "H5",
        },
    ).json()

    set_user_role("AI_ENGINEER")
    sent_for_review = client.patch(
        f"/api/v1/model-versions/{model['id']}",
        json={"status": "REVIEW"},
    )
    assert sent_for_review.status_code == 200

    set_user_role("REVIEWER")
    approved = client.patch(
        f"/api/v1/model-versions/{model['id']}",
        json={"status": "APPROVED"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"
    forbidden_create = client.post(
        "/api/v1/model-versions",
        json={
            "projectId": project["id"],
            "architectureId": architecture["id"],
            "name": "otro",
            "version": "1.0",
            "format": "H5",
        },
    )
    assert forbidden_create.status_code == 403


def test_dataset_split_validation(client):
    response = client.post(
        "/api/v1/datasets",
        json={
            "name": "datos.csv",
            "format": "CSV",
            "trainSplit": 0.8,
            "valSplit": 0.4,
        },
    )

    assert response.status_code == 422


def test_dataset_csv_upload_and_delete(client, tmp_path, monkeypatch):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(dataset_storage_dir=tmp_path),
    )
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.csv", b"feature,label\n1,0\n2,1\n", "text/csv")},
        data={
            "trainSplit": "0.75",
            "valSplit": "0.25",
            "description": "Etiquetas de prueba",
            "targetColumn": "label",
            "featureColumns": "feature",
            "sequenceLength": "12",
        },
    )

    assert response.status_code == 201
    dataset = response.json()
    assert dataset["name"] == "datos.csv"
    assert dataset["format"] == "CSV"
    assert dataset["description"] == "Etiquetas de prueba"
    assert dataset["targetColumn"] == "label"
    assert dataset["featureColumns"] == ["feature"]
    assert dataset["sequenceLength"] == 12
    assert dataset["sizeBytes"] == len(b"feature,label\n1,0\n2,1\n")
    storage_file = tmp_path / dataset["storagePath"]
    assert storage_file.read_bytes() == b"feature,label\n1,0\n2,1\n"

    deleted = client.delete(f"/api/v1/datasets/{dataset['id']}")
    assert deleted.status_code == 204
    assert not storage_file.exists()


def test_dataset_csv_preview_returns_limited_records(client, tmp_path, monkeypatch):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(dataset_storage_dir=tmp_path),
    )
    uploaded = client.post(
        "/api/v1/datasets/upload",
        files={
            "file": (
                "muestras.csv",
                b"\xef\xbb\xbfid;label\n1;gato\n2;perro\n3;gato\n",
                "text/csv",
            )
        },
    )
    dataset_id = uploaded.json()["id"]

    response = client.get(f"/api/v1/datasets/{dataset_id}/preview?limit=2")

    assert response.status_code == 200
    assert response.json() == {
        "columns": ["id", "label"],
        "records": [
            {"id": "1", "label": "gato"},
            {"id": "2", "label": "perro"},
        ],
        "rowsReturned": 2,
        "hasMore": True,
    }


def test_huggingface_dataset_upload_preview_and_delete(client, tmp_path, monkeypatch):
    from pathlib import Path
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    settings = SimpleNamespace(
        dataset_storage_dir=tmp_path,
        hf_token="test-token",
        hf_dataset_repo_id="Nagumo55/Redes_Neuronales",
        s3_bucket=None,
    )
    remote_files = {}

    def upload_file(source, path_in_repo, configured):
        assert configured is settings
        remote_files[path_in_repo] = Path(source).read_bytes()

    def download_file(path_in_repo, destination, configured):
        assert configured is settings
        destination.write_bytes(remote_files[path_in_repo])

    def delete_file(path_in_repo, configured):
        assert configured is settings
        del remote_files[path_in_repo]

    monkeypatch.setattr(resources, "get_settings", lambda: settings)
    monkeypatch.setattr(resources.huggingface_storage, "upload_file", upload_file)
    monkeypatch.setattr(resources.huggingface_storage, "download_file", download_file)
    monkeypatch.setattr(resources.huggingface_storage, "delete_file", delete_file)

    uploaded = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.csv", b"feature,label\n1,0\n2,1\n", "text/csv")},
    )

    assert uploaded.status_code == 201
    dataset = uploaded.json()
    assert dataset["storagePath"].startswith("huggingface/")
    assert not list(tmp_path.rglob("*.csv"))
    assert len(remote_files) == 1

    preview = client.get(f"/api/v1/datasets/{dataset['id']}/preview")
    assert preview.status_code == 200
    assert preview.json()["records"] == [
        {"feature": "1", "label": "0"},
        {"feature": "2", "label": "1"},
    ]

    deleted = client.delete(f"/api/v1/datasets/{dataset['id']}")
    assert deleted.status_code == 204
    assert remote_files == {}


def test_worker_downloads_private_huggingface_dataset(client, tmp_path, monkeypatch):
    from types import SimpleNamespace

    import app.api.v1.deps as dependencies
    from app.api.v1.endpoints import resources

    settings = SimpleNamespace(
        dataset_storage_dir=tmp_path,
        hf_token="test-token",
        hf_dataset_repo_id="Nagumo55/Redes_Neuronales",
        s3_bucket=None,
    )
    monkeypatch.setattr(resources, "get_settings", lambda: settings)
    monkeypatch.setattr(
        dependencies,
        "get_settings",
        lambda: SimpleNamespace(worker_api_key="test-worker-key"),
    )
    monkeypatch.setattr(
        resources.huggingface_storage,
        "upload_file",
        lambda *args: None,
    )
    monkeypatch.setattr(
        resources.huggingface_storage,
        "download_file",
        lambda _key, destination, _settings: destination.write_bytes(b"x,label\n1,0\n"),
    )
    uploaded = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.csv", b"x,label\n1,0\n", "text/csv")},
    )
    dataset_id = uploaded.json()["id"]

    response = client.get(
        f"/api/v1/datasets/worker/{dataset_id}/download",
        headers={"Authorization": "Bearer test-worker-key"},
    )

    assert response.status_code == 200
    assert response.content == b"x,label\n1,0\n"


def test_dataset_upload_rejects_partial_huggingface_configuration(
    client, tmp_path, monkeypatch
):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(
            dataset_storage_dir=tmp_path,
            hf_token="test-token",
            hf_dataset_repo_id=None,
            s3_bucket=None,
        ),
    )

    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.csv", b"x,label\n1,0\n", "text/csv")},
    )

    assert response.status_code == 503
    assert "HF_TOKEN y HF_DATASET_REPO_ID" in response.json()["detail"]
    assert not any(path.is_file() for path in tmp_path.rglob("*"))


def test_dataset_preview_rejects_non_csv_files(client, tmp_path, monkeypatch):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(dataset_storage_dir=tmp_path),
    )
    uploaded = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("imagen.png", b"image content", "image/png")},
    )

    response = client.get(
        f"/api/v1/datasets/{uploaded.json()['id']}/preview"
    )

    assert response.status_code == 415
    assert "CSV" in response.json()["detail"]


def test_dataset_image_uploads_are_stored_as_images(client, tmp_path, monkeypatch):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(dataset_storage_dir=tmp_path),
    )
    for filename in ("imagen.png", "foto.jpg", "foto.jpeg", "imagen.webp", "imagen.bmp", "imagen.gif", "imagen.tif", "imagen.tiff"):
        response = client.post(
            "/api/v1/datasets/upload",
            files={"file": (filename, b"image content", "application/octet-stream")},
        )

        assert response.status_code == 201
        dataset = response.json()
        assert dataset["name"] == filename
        assert dataset["format"] == "IMAGES"
        assert (tmp_path / dataset["storagePath"]).read_bytes() == b"image content"


def test_dataset_upload_rejects_unsupported_format(client):
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.exe", b"not a dataset", "application/octet-stream")},
    )

    assert response.status_code == 400


def test_dataset_upload_accepts_files_larger_than_previous_limit(
    client, tmp_path, monkeypatch
):
    from types import SimpleNamespace

    from app.api.v1.endpoints import resources

    monkeypatch.setattr(
        resources,
        "get_settings",
        lambda: SimpleNamespace(dataset_storage_dir=tmp_path),
    )
    content = b"x" * (50 * 1024 * 1024 + 1)
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("datos.csv", content, "text/csv")},
    )

    assert response.status_code == 201
    assert response.json()["sizeBytes"] == len(content)


def test_training_resources_are_scoped_to_owner(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "base.csv", "format": "CSV"},
    ).json()
    created = client.post(
        "/api/v1/projects",
        json={
            "name": "Privado",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
        },
    )
    assert created.status_code == 201

    app = client.app
    from app.api.v1.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "another-user",
        "email": "other@example.com",
    }
    listed = client.get("/api/v1/projects")

    assert listed.status_code == 200
    assert listed.json()["total"] == 0


def test_training_jobs_require_owned_resources_and_queue_safely(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={
            "name": "train.csv",
            "format": "CSV",
            "rows": 120,
            "sizeBytes": 2048,
        },
    )
    assert dataset.status_code == 201
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Entrenamiento",
            "objective": "Clasificar muestras",
            "datasetId": dataset.json()["id"],
        },
    ).json()

    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "CNN",
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "input", "type": "Input", "neurons": 10, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu", "kernelSize": 5},
                {"id": "output", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    )
    assert architecture.status_code == 201

    queued = client.post(
        "/api/v1/training-jobs",
        json={
            "projectId": project["id"],
            "datasetId": dataset.json()["id"],
            "architectureId": architecture.json()["id"],
            "totalEpochs": 2,
            "configuration": {
                "batchSize": 64,
                "learningRate": 0.0005,
                "optimizer": "rmsprop",
                "loss": "binary_crossentropy",
                "earlyStopping": False,
                "patience": 3,
                "seed": 17,
            },
        },
    )
    assert queued.status_code == 202
    assert queued.json()["status"] == "QUEUED"
    assert queued.json()["modelFamily"] == "CNN"
    assert queued.json()["configuration"]["batchSize"] == 64
    assert queued.json()["configuration"]["loss"] == "binary_crossentropy"

    forged_metric = client.post(
        f"/api/v1/training-jobs/{queued.json()['id']}/metrics",
        json={
            "epoch": 1,
            "trainLoss": 0.5,
            "valLoss": 0.6,
            "trainAccuracy": 0.7,
            "valAccuracy": 0.65,
        },
    )
    assert forged_metric.status_code == 401
    assert client.delete(
        f"/api/v1/architectures/{architecture.json()['id']}"
    ).status_code == 409
    assert client.delete(
        f"/api/v1/datasets/{dataset.json()['id']}"
    ).status_code == 409
    assert client.delete(f"/api/v1/training-jobs/{queued.json()['id']}").status_code == 204
    assert client.delete(
        f"/api/v1/architectures/{architecture.json()['id']}"
    ).status_code == 204


def test_admin_can_delete_completed_training_but_not_running(client):
    from sqlalchemy.orm import Session

    from app.db.models import TrainingJob
    from app.db.session import engine

    resources = create_training_job(client)
    with Session(engine) as db:
        job = db.get(TrainingJob, resources["jobId"])
        job.status = "COMPLETED"
        db.commit()

    set_user_role("AI_ENGINEER")
    forbidden = client.delete(f"/api/v1/training-jobs/{resources['jobId']}")
    assert forbidden.status_code == 409

    set_user_role("ADMIN")
    deleted = client.delete(f"/api/v1/training-jobs/{resources['jobId']}")
    assert deleted.status_code == 204

    running = create_training_job(client, "Entrenamiento en ejecución")
    with Session(engine) as db:
        job = db.get(TrainingJob, running["jobId"])
        job.status = "RUNNING"
        db.commit()

    rejected = client.delete(f"/api/v1/training-jobs/{running['jobId']}")
    assert rejected.status_code == 409
    assert "ejecutándose" in rejected.json()["detail"]


def test_admin_can_delete_project_after_removing_training(client):
    resources = create_training_job(client)

    set_user_role("PROJECT_MANAGER")
    forbidden = client.delete(
        f"/api/v1/projects/{resources['projectId']}/permanent"
    )
    assert forbidden.status_code == 403

    set_user_role("ADMIN")
    blocked = client.delete(
        f"/api/v1/projects/{resources['projectId']}/permanent"
    )
    assert blocked.status_code == 409
    assert "entrenamientos" in blocked.json()["detail"]

    from sqlalchemy.orm import Session

    from app.db.models import TrainingJob
    from app.db.session import engine

    with Session(engine) as db:
        job = db.get(TrainingJob, resources["jobId"])
        job.status = "COMPLETED"
        db.commit()
    assert client.delete(
        f"/api/v1/training-jobs/{resources['jobId']}"
    ).status_code == 204

    deleted = client.delete(
        f"/api/v1/projects/{resources['projectId']}/permanent"
    )
    assert deleted.status_code == 204
    assert client.get(
        f"/api/v1/projects/{resources['projectId']}"
    ).status_code == 404

    datasets = client.get("/api/v1/datasets").json()["items"]
    dataset = next(
        item for item in datasets if item["id"] == resources["datasetId"]
    )
    assert dataset["projectId"] is None


def test_model_and_report_crud_deletion(client):
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "model.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Modelos",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
        },
    ).json()
    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "CNN",
            "family": "CNN",
            "inputShape": [28, 28, 1],
            "layers": [
                {"id": "in", "type": "Input", "neurons": 2, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 8, "activation": "relu"},
                {"id": "out", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    ).json()
    model = client.post(
        "/api/v1/model-versions",
        json={
            "projectId": project["id"],
            "architectureId": architecture["id"],
            "name": "borrador",
            "version": "1.0",
            "format": "H5",
        },
    ).json()
    assert client.delete(f"/api/v1/model-versions/{model['id']}").status_code == 204

    report = client.post(
        "/api/v1/reports",
        json={"name": "solicitud", "format": "PDF"},
    ).json()
    assert client.delete(f"/api/v1/reports/{report['id']}").status_code == 204


def test_protected_routes_reject_missing_access_token(client):
    from app.api.v1.deps import get_current_user

    client.app.dependency_overrides.pop(get_current_user)
    response = client.get("/api/v1/projects")

    assert response.status_code == 401
def test_training_worker_claims_completes_and_fails_jobs(client, monkeypatch):
    from types import SimpleNamespace

    import app.api.v1.deps as dependencies

    monkeypatch.setattr(
        dependencies,
        "get_settings",
        lambda: SimpleNamespace(worker_api_key="worker-secret"),
    )
    worker_headers = {"Authorization": "Bearer worker-secret"}
    dataset = client.post(
        "/api/v1/datasets",
        json={"name": "worker.csv", "format": "CSV"},
    ).json()
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Worker",
            "objective": "Clasificar muestras",
            "datasetId": dataset["id"],
            "modelFamily": "CNN",
        },
    ).json()
    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "Worker CNN",
            "family": "CNN",
            "inputShape": [2, 2, 1],
            "layers": [
                {"id": "input", "type": "Input", "neurons": 1, "activation": "None"},
                {"id": "conv", "type": "Conv2D", "neurons": 4, "activation": "relu"},
                {"id": "output", "type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
    ).json()

    def create_job():
        response = client.post(
            "/api/v1/training-jobs",
            json={
                "projectId": project["id"],
                "datasetId": dataset["id"],
                "architectureId": architecture["id"],
                "totalEpochs": 2,
                "configuration": {"loss": "binary_crossentropy"},
            },
        )
        assert response.status_code == 202
        return response.json()["id"]

    job_id = create_job()
    claim = client.post(
        "/api/v1/training-jobs/worker/claim", headers=worker_headers
    )
    assert claim.status_code == 200
    assert claim.json()["job"]["id"] == job_id
    assert claim.json()["job"]["dataset"]["storagePath"] is None

    metric = client.post(
        f"/api/v1/training-jobs/{job_id}/metrics",
        headers=worker_headers,
        json={
            "epoch": 1,
            "trainLoss": 0.4,
            "valLoss": 0.5,
            "trainAccuracy": 0.8,
            "valAccuracy": 0.75,
        },
    )
    assert metric.status_code == 201
    completed = client.post(
        f"/api/v1/training-jobs/{job_id}/complete",
        headers=worker_headers,
        json={
            "artifactPath": f"{job_id}.keras",
            "checksum": "a" * 64,
            "sizeBytes": 128,
            "valAccuracy": 0.75,
            "precision": 0.7,
            "recall": 0.8,
            "f1Score": 0.74,
            "confusionMatrix": [[7, 1], [2, 6]],
        },
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"
    reported_job = client.get("/api/v1/training-jobs").json()["items"][0]
    assert reported_job["precision"] == 0.7
    assert reported_job["recall"] == 0.8
    assert reported_job["f1Score"] == 0.74
    assert reported_job["confusionMatrix"] == [[7, 1], [2, 6]]
    models = client.get("/api/v1/model-versions")
    assert models.status_code == 200
    assert models.json()["items"][0]["format"] == "KERAS"

    failed_job_id = create_job()
    second_claim = client.post(
        "/api/v1/training-jobs/worker/claim", headers=worker_headers
    )
    assert second_claim.json()["job"]["id"] == failed_job_id
    failed = client.post(
        f"/api/v1/training-jobs/{failed_job_id}/fail",
        headers=worker_headers,
        json={"error": "CSV inválido"},
    )
    assert failed.status_code == 200
    assert failed.json()["status"] == "FAILED"
    missing_target = client.post(f"/api/v1/training-jobs/{failed_job_id}/start")
    assert missing_target.status_code == 409
    assert "columna objetivo" in missing_target.json()["detail"]
    updated_dataset = client.patch(
        f"/api/v1/datasets/{dataset['id']}",
        json={"targetColumn": "label"},
    )
    assert updated_dataset.status_code == 200
    restarted = client.post(f"/api/v1/training-jobs/{failed_job_id}/start")
    assert restarted.status_code == 202
    assert restarted.json()["status"] == "QUEUED"
    assert restarted.json()["epoch"] == 0
    assert restarted.json()["errorMessage"] is None
    assert client.get(f"/api/v1/training-jobs/{failed_job_id}/metrics").json()["total"] == 0

    restarted_claim = client.post(
        "/api/v1/training-jobs/worker/claim", headers=worker_headers
    )
    assert restarted_claim.json()["job"]["id"] == failed_job_id
    restarted_metric = client.post(
        f"/api/v1/training-jobs/{failed_job_id}/metrics",
        headers=worker_headers,
        json={
            "epoch": 1,
            "trainLoss": 0.3,
            "valLoss": 0.4,
            "trainAccuracy": 0.9,
            "valAccuracy": 0.85,
        },
    )
    assert restarted_metric.status_code == 201
    assert client.post(f"/api/v1/training-jobs/{failed_job_id}/start").status_code == 409
