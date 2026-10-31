def test_health_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_checks_database(client):
    response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}


def test_projects_create_and_list(client):
    created = client.post(
        "/api/v1/projects",
        json={"name": "Clasificador", "description": "Proyecto de prueba"},
    )

    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "Clasificador"
    assert project["status"] == "ACTIVE"
    assert project["datasetsCount"] == 0

    listed = client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == project["id"]


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


def test_training_resources_are_scoped_to_owner(client):
    created = client.post("/api/v1/projects", json={"name": "Privado"})
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
    project = client.post(
        "/api/v1/projects", json={"name": "Entrenamiento"}
    ).json()
    dataset = client.post(
        "/api/v1/datasets",
        json={
            "projectId": project["id"],
            "name": "train.csv",
            "format": "CSV",
            "rows": 120,
            "sizeBytes": 2048,
        },
    )
    assert dataset.status_code == 201

    architecture = client.post(
        "/api/v1/architectures",
        json={
            "projectId": project["id"],
            "name": "MLP",
            "family": "Feedforward",
            "layers": [
                {"id": "input", "type": "Input", "neurons": 10, "activation": "None"},
                {"id": "hidden", "type": "Dense", "neurons": 8, "activation": "relu"},
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
        },
    )
    assert queued.status_code == 202
    assert queued.json()["status"] == "QUEUED"

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


def test_protected_routes_reject_missing_access_token(client):
    from app.api.v1.deps import get_current_user

    client.app.dependency_overrides.pop(get_current_user)
    response = client.get("/api/v1/projects")

    assert response.status_code == 401
