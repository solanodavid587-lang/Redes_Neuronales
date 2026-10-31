from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    get_current_user,
    get_user_email,
    get_user_id,
    require_admin,
    require_worker,
)
from app.db.models import (
    Architecture,
    AuditLog,
    Dataset,
    GeneratedReport,
    ModelVersion,
    Project,
    TrainingJob,
    TrainingMetric,
)
from app.db.session import get_db
from app.schemas.api import (
    ArchitectureCreate,
    ArchitectureUpdate,
    DatasetCreate,
    MetricCreate,
    ModelVersionCreate,
    ModelVersionUpdate,
    ProjectCreate,
    ProjectUpdate,
    ReportCreate,
    TrainingCreate,
)

router = APIRouter()


def paginated(
    db: Session,
    statement: Any,
    count_statement: Any,
    limit: int,
    offset: int,
) -> dict[str, Any]:
    return {
        "items": list(db.scalars(statement.limit(limit).offset(offset)).all()),
        "total": db.scalar(count_statement) or 0,
        "limit": limit,
        "offset": offset,
    }


def owned_or_404(
    db: Session, model: Any, item_id: str, owner_id: str
) -> Any:
    item = db.scalar(
        select(model).where(model.id == item_id, model.owner_id == owner_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")
    return item


def verify_owned(
    db: Session, model: Any, item_id: str | None, owner_id: str, label: str
) -> Any | None:
    if item_id is None:
        return None
    item = db.scalar(
        select(model).where(model.id == item_id, model.owner_id == owner_id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail=f"{label} no encontrado.")
    return item


def add_audit(
    db: Session, owner_id: str, actor: str, action: str, target: str
) -> None:
    db.add(AuditLog(owner_id=owner_id, actor=actor, action=action, target=target))


def bytes_label(size: int) -> str:
    units = ("B", "KB", "MB", "GB", "TB")
    amount = float(size)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            return f"{amount:.1f} {unit}" if unit != "B" else f"{int(amount)} B"
        amount /= 1024
    return f"{size} B"


def project_output(
    db: Session, project: Project, user: dict[str, Any]
) -> dict[str, Any]:
    datasets = db.scalar(
        select(func.count(Dataset.id)).where(Dataset.project_id == project.id)
    )
    models = db.scalar(
        select(func.count(ModelVersion.id)).where(
            ModelVersion.project_id == project.id
        )
    )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "owner": get_user_email(user),
        "createdAt": project.created_at.isoformat(),
        "modelsCount": models or 0,
        "datasetsCount": datasets or 0,
        "lastActivity": project.updated_at.isoformat(),
    }


def dataset_output(dataset: Dataset) -> dict[str, Any]:
    return {
        "id": dataset.id,
        "projectId": dataset.project_id,
        "name": dataset.name,
        "format": dataset.format,
        "size": bytes_label(dataset.size_bytes),
        "sizeBytes": dataset.size_bytes,
        "storagePath": dataset.storage_path,
        "rows": dataset.rows_count,
        "status": dataset.status,
        "trainSplit": dataset.train_split,
        "valSplit": dataset.val_split,
        "uploadedAt": dataset.uploaded_at.isoformat(),
    }


def architecture_output(architecture: Architecture) -> dict[str, Any]:
    return {
        "id": architecture.id,
        "projectId": architecture.project_id,
        "name": architecture.name,
        "family": architecture.family,
        "layers": architecture.layers,
        "status": architecture.status,
        "createdAt": architecture.created_at.isoformat(),
        "updatedAt": architecture.updated_at.isoformat(),
    }


def training_output(db: Session, job: TrainingJob) -> dict[str, Any]:
    project = db.get(Project, job.project_id)
    architecture = db.get(Architecture, job.architecture_id)
    return {
        "id": job.id,
        "projectId": job.project_id,
        "projectName": project.name if project else "",
        "datasetId": job.dataset_id,
        "architectureId": job.architecture_id,
        "architecture": architecture.name if architecture else "",
        "status": job.status,
        "progress": job.progress,
        "epoch": job.epoch,
        "totalEpochs": job.total_epochs,
        "loss": str(job.loss) if job.loss is not None else "—",
        "accuracy": f"{job.accuracy:.1%}" if job.accuracy is not None else "—",
        "startedAt": job.started_at.isoformat(),
    }


def model_output(db: Session, model: ModelVersion) -> dict[str, Any]:
    project = db.get(Project, model.project_id)
    architecture = db.get(Architecture, model.architecture_id)
    return {
        "id": model.id,
        "name": model.name,
        "version": model.version,
        "projectId": model.project_id,
        "projectName": project.name if project else "",
        "architectureId": model.architecture_id,
        "architecture": architecture.name if architecture else "",
        "status": model.status,
        "accuracy": f"{model.accuracy:.1%}" if model.accuracy is not None else "—",
        "size": bytes_label(model.size_bytes),
        "sizeBytes": model.size_bytes,
        "format": model.format,
        "createdAt": model.created_at.isoformat(),
        "createdBy": model.created_by,
        "checksum": model.checksum,
    }


def report_output(report: GeneratedReport) -> dict[str, Any]:
    return {
        "id": report.id,
        "projectId": report.project_id,
        "name": report.name,
        "format": report.format,
        "status": report.status,
        "size": bytes_label(report.size_bytes),
        "requestedBy": report.requested_by,
        "date": report.created_at.isoformat(),
    }


@router.get("/projects")
def list_projects(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = None,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    statement = select(Project).where(Project.owner_id == owner_id)
    count_statement = select(func.count(Project.id)).where(
        Project.owner_id == owner_id
    )
    if search:
        statement = statement.where(Project.name.ilike(f"%{search}%"))
        count_statement = count_statement.where(Project.name.ilike(f"%{search}%"))
    page = paginated(
        db,
        statement.order_by(Project.updated_at.desc()),
        count_statement,
        limit,
        offset,
    )
    return {
        **page,
        "items": [project_output(db, project, user) for project in page["items"]],
    }


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    project = Project(owner_id=get_user_id(user), **payload.model_dump())
    db.add(project)
    db.flush()
    add_audit(db, project.owner_id, get_user_email(user), "project.created", project.id)
    db.commit()
    db.refresh(project)
    return project_output(db, project, user)


@router.get("/projects/{project_id}")
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    project = owned_or_404(db, Project, project_id, get_user_id(user))
    return project_output(db, project, user)


@router.patch("/projects/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    project = owned_or_404(db, Project, project_id, get_user_id(user))
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    project.updated_at = datetime.now(timezone.utc)
    add_audit(db, project.owner_id, get_user_email(user), "project.updated", project.id)
    db.commit()
    db.refresh(project)
    return project_output(db, project, user)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> None:
    project = owned_or_404(db, Project, project_id, get_user_id(user))
    project.status = "ARCHIVED"
    project.updated_at = datetime.now(timezone.utc)
    add_audit(db, project.owner_id, get_user_email(user), "project.archived", project.id)
    db.commit()


@router.get("/datasets")
def list_datasets(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    page = paginated(
        db,
        select(Dataset)
        .where(Dataset.owner_id == owner_id)
        .order_by(Dataset.uploaded_at.desc()),
        select(func.count(Dataset.id)).where(Dataset.owner_id == owner_id),
        limit,
        offset,
    )
    return {**page, "items": [dataset_output(item) for item in page["items"]]}


@router.post("/datasets", status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: DatasetCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    dataset = Dataset(
        owner_id=owner_id,
        rows_count=payload.rows,
        **payload.model_dump(exclude={"rows"}),
    )
    db.add(dataset)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "dataset.created", dataset.id)
    db.commit()
    db.refresh(dataset)
    return dataset_output(dataset)


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> None:
    dataset = owned_or_404(db, Dataset, dataset_id, get_user_id(user))
    db.delete(dataset)
    db.commit()


@router.get("/architectures")
def list_architectures(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    page = paginated(
        db,
        select(Architecture)
        .where(Architecture.owner_id == owner_id)
        .order_by(Architecture.updated_at.desc()),
        select(func.count(Architecture.id)).where(Architecture.owner_id == owner_id),
        limit,
        offset,
    )
    return {**page, "items": [architecture_output(item) for item in page["items"]]}


@router.post("/architectures", status_code=status.HTTP_201_CREATED)
def create_architecture(
    payload: ArchitectureCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    architecture_data = payload.model_dump(exclude={"layers"})
    architecture = Architecture(
        owner_id=owner_id,
        layers=[layer.model_dump() for layer in payload.layers],
        **architecture_data,
    )
    db.add(architecture)
    db.flush()
    add_audit(
        db, owner_id, get_user_email(user), "architecture.created", architecture.id
    )
    db.commit()
    db.refresh(architecture)
    return architecture_output(architecture)


@router.patch("/architectures/{architecture_id}")
def update_architecture(
    architecture_id: str,
    payload: ArchitectureUpdate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    architecture = owned_or_404(
        db, Architecture, architecture_id, get_user_id(user)
    )
    updates = payload.model_dump(exclude_unset=True, exclude={"layers"})
    for key, value in updates.items():
        setattr(architecture, key, value)
    if payload.layers is not None:
        architecture.layers = [layer.model_dump() for layer in payload.layers]
    architecture.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(architecture)
    return architecture_output(architecture)


@router.post("/architectures/{architecture_id}/validate")
def validate_architecture(
    architecture_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    architecture = owned_or_404(
        db, Architecture, architecture_id, get_user_id(user)
    )
    layers = architecture.layers
    errors = []
    if len(layers) < 3:
        errors.append("La arquitectura debe tener al menos una capa oculta.")
    if layers and layers[0].get("type") != "Input":
        errors.append("La primera capa debe ser de tipo Input.")
    if layers and layers[-1].get("type") != "Output":
        errors.append("La última capa debe ser de tipo Output.")
    return {"valid": not errors, "errors": errors, "validationOnly": True}


@router.get("/training-jobs")
def list_training_jobs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    page = paginated(
        db,
        select(TrainingJob)
        .where(TrainingJob.owner_id == owner_id)
        .order_by(TrainingJob.created_at.desc()),
        select(func.count(TrainingJob.id)).where(TrainingJob.owner_id == owner_id),
        limit,
        offset,
    )
    return {**page, "items": [training_output(db, item) for item in page["items"]]}


@router.post("/training-jobs", status_code=status.HTTP_202_ACCEPTED)
def create_training_job(
    payload: TrainingCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    project = verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    dataset = verify_owned(db, Dataset, payload.dataset_id, owner_id, "Dataset")
    architecture = verify_owned(
        db, Architecture, payload.architecture_id, owner_id, "Arquitectura"
    )
    if dataset.project_id not in {None, project.id}:
        raise HTTPException(
            status_code=409,
            detail="El dataset no pertenece al proyecto seleccionado.",
        )
    if architecture.project_id not in {None, project.id}:
        raise HTTPException(
            status_code=409,
            detail="La arquitectura no pertenece al proyecto seleccionado.",
        )
    job = TrainingJob(owner_id=owner_id, **payload.model_dump())
    db.add(job)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "training.queued", job.id)
    db.commit()
    db.refresh(job)
    return training_output(db, job)


@router.get("/training-jobs/{job_id}/metrics")
def list_training_metrics(
    job_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    job = owned_or_404(db, TrainingJob, job_id, get_user_id(user))
    metrics = db.scalars(
        select(TrainingMetric)
        .where(
            TrainingMetric.job_id == job.id,
            TrainingMetric.owner_id == job.owner_id,
        )
        .order_by(TrainingMetric.epoch)
    ).all()
    return {
        "items": [
            {
                "epoch": item.epoch,
                "trainLoss": item.train_loss,
                "valLoss": item.val_loss,
                "trainAcc": item.train_accuracy,
                "valAcc": item.val_accuracy,
            }
            for item in metrics
        ],
        "total": len(metrics),
    }


@router.post(
    "/training-jobs/{job_id}/metrics", status_code=status.HTTP_201_CREATED
)
def record_training_metric(
    job_id: str,
    payload: MetricCreate,
    db: Session = Depends(get_db),
    _worker: None = Depends(require_worker),
) -> dict[str, Any]:
    job = db.get(TrainingJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Trabajo de entrenamiento no encontrado.")
    if job.status not in {"QUEUED", "RUNNING"}:
        raise HTTPException(status_code=409, detail="El trabajo ya no acepta métricas.")
    if payload.epoch > job.total_epochs:
        raise HTTPException(
            status_code=422, detail="La época no puede superar totalEpochs."
        )
    if payload.epoch <= job.epoch:
        raise HTTPException(
            status_code=409, detail="La época debe ser posterior a la última registrada."
        )
    metric = TrainingMetric(
        owner_id=job.owner_id,
        job_id=job.id,
        **payload.model_dump(),
    )
    job.status = "RUNNING"
    job.epoch = payload.epoch
    job.progress = min(100, round(payload.epoch * 100 / job.total_epochs))
    job.loss = payload.train_loss
    job.accuracy = payload.train_accuracy
    if payload.epoch >= job.total_epochs:
        job.status = "COMPLETED"
        job.progress = 100
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return {
        "epoch": metric.epoch,
        "trainLoss": metric.train_loss,
        "valLoss": metric.val_loss,
        "trainAcc": metric.train_accuracy,
        "valAcc": metric.val_accuracy,
    }


@router.get("/model-versions")
def list_model_versions(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    page = paginated(
        db,
        select(ModelVersion)
        .where(ModelVersion.owner_id == owner_id)
        .order_by(ModelVersion.created_at.desc()),
        select(func.count(ModelVersion.id)).where(ModelVersion.owner_id == owner_id),
        limit,
        offset,
    )
    return {**page, "items": [model_output(db, item) for item in page["items"]]}


@router.post("/model-versions", status_code=status.HTTP_201_CREATED)
def create_model_version(
    payload: ModelVersionCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    verify_owned(db, Architecture, payload.architecture_id, owner_id, "Arquitectura")
    model = ModelVersion(
        owner_id=owner_id,
        created_by=get_user_email(user),
        **payload.model_dump(),
    )
    db.add(model)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "model.created", model.id)
    db.commit()
    db.refresh(model)
    return model_output(db, model)


@router.patch("/model-versions/{model_id}")
def update_model_version(
    model_id: str,
    payload: ModelVersionUpdate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    model = owned_or_404(db, ModelVersion, model_id, get_user_id(user))
    allowed_transitions = {
        "DRAFT": {"REVIEW", "RETIRED"},
        "REVIEW": {"APPROVED", "DRAFT", "RETIRED"},
        "APPROVED": {"RETIRED"},
        "RETIRED": set(),
    }
    if payload.status != model.status and payload.status not in allowed_transitions[model.status]:
        raise HTTPException(status_code=409, detail="Transición de estado no permitida.")
    model.status = payload.status
    db.commit()
    db.refresh(model)
    return model_output(db, model)


@router.get("/reports")
def list_reports(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    page = paginated(
        db,
        select(GeneratedReport)
        .where(GeneratedReport.owner_id == owner_id)
        .order_by(GeneratedReport.created_at.desc()),
        select(func.count(GeneratedReport.id)).where(
            GeneratedReport.owner_id == owner_id
        ),
        limit,
        offset,
    )
    return {**page, "items": [report_output(item) for item in page["items"]]}


@router.post("/reports", status_code=status.HTTP_202_ACCEPTED)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    report = GeneratedReport(
        owner_id=owner_id,
        requested_by=get_user_email(user),
        **payload.model_dump(),
    )
    db.add(report)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "report.requested", report.id)
    db.commit()
    db.refresh(report)
    return report_output(report)


@router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    jobs = db.scalars(
        select(TrainingJob)
        .where(TrainingJob.owner_id == owner_id)
        .order_by(TrainingJob.created_at.desc())
        .limit(5)
    ).all()
    completed = db.scalar(
        select(func.count(TrainingJob.id)).where(
            TrainingJob.owner_id == owner_id,
            TrainingJob.status == "COMPLETED",
        )
    ) or 0
    total = db.scalar(
        select(func.count(TrainingJob.id)).where(TrainingJob.owner_id == owner_id)
    ) or 0
    approved_models = db.scalar(
        select(func.count(ModelVersion.id)).where(
            ModelVersion.owner_id == owner_id,
            ModelVersion.status == "APPROVED",
        )
    ) or 0
    return {
        "kpis": {
            "computeCost": "—",
            "computeCostTrend": "—",
            "avgTrainingTime": "—",
            "avgTrainingTimeTrend": "—",
            "jobSuccessRate": f"{(completed / total * 100):.0f}%" if total else "—",
            "jobSuccessRateTrend": "—",
            "modelsInProduction": str(approved_models),
            "modelsInProductionTrend": "—",
        },
        "recentJobs": [training_output(db, job) for job in jobs],
        "alerts": None,
    }


@router.get("/audit")
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.owner_id == owner_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    total = db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.owner_id == owner_id)
    ) or 0
    return {
        "items": [
            {
                "id": log.id,
                "action": log.action,
                "actor": log.actor,
                "target": log.target,
                "timestamp": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
