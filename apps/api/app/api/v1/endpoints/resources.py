from datetime import datetime, timezone
import csv
import hashlib
import logging
import os
from pathlib import Path
import tempfile
from typing import Any
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from app.core.config import get_settings
from app.core import huggingface_storage
from app.core.object_storage import (
    download_file as download_object_file,
    delete_file as delete_object_file,
    is_object_storage_configured,
    upload_file as upload_object_file,
)
from app.api.v1.deps import (
    get_current_user,
    get_user_email,
    get_user_id,
    require_admin,
    require_roles,
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
    DatasetUpdate,
    MetricCreate,
    ModelVersionCreate,
    ModelVersionUpdate,
    ProjectCreate,
    ProjectUpdate,
    ReportCreate,
    TrainingComplete,
    TrainingCreate,
    TrainingFailure,
)

router = APIRouter()
logger = logging.getLogger(__name__)
max_dataset_preview_bytes = 1024 * 1024
dataset_formats = {
    ".csv": "CSV",
    ".json": "JSON",
    ".zip": "IMAGES",
    ".txt": "TEXT",
    ".png": "IMAGES",
    ".jpg": "IMAGES",
    ".jpeg": "IMAGES",
    ".webp": "IMAGES",
    ".bmp": "IMAGES",
    ".gif": "IMAGES",
    ".tif": "IMAGES",
    ".tiff": "IMAGES",
}


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


def architecture_layer_errors(
    family: str, layers: list[dict[str, Any]], input_shape: list[int]
) -> list[str]:
    cnn_layers = {"Input", "Conv2D", "MaxPooling2D", "Flatten", "Dense", "Dropout", "Output"}
    rnn_layers = {"Input", "LSTM", "GRU", "SimpleRNN", "Dense", "Dropout", "Output"}
    allowed_layers = cnn_layers if family == "CNN" else rnn_layers
    errors = [
        f"La capa {layer.get('type')} no pertenece a una arquitectura {family}."
        for layer in layers
        if layer.get("type") not in allowed_layers
    ]
    family_layers = {"Conv2D"} if family == "CNN" else {
        "LSTM",
        "GRU",
        "SimpleRNN",
    }
    if not any(layer.get("type") in family_layers for layer in layers):
        errors.append(f"La arquitectura debe incluir al menos una capa propia de {family}.")
    if layers and layers[0].get("type") != "Input":
        errors.append("La primera capa debe ser de tipo Input.")
    if layers and layers[-1].get("type") != "Output":
        errors.append("La última capa debe ser de tipo Output.")
    expected_dimensions = 3 if family == "CNN" else 2
    if len(input_shape) != expected_dimensions:
        errors.append(
            f"La forma de entrada de {family} debe tener {expected_dimensions} dimensiones."
        )
    return errors


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
    dataset_id = db.scalar(
        select(Dataset.id)
        .where(Dataset.project_id == project.id)
        .order_by(Dataset.uploaded_at)
        .limit(1)
    )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "objective": project.objective,
        "modelFamily": project.model_family,
        "status": project.status,
        "owner": get_user_email(user),
        "createdAt": project.created_at.isoformat(),
        "modelsCount": models or 0,
        "datasetsCount": datasets or 0,
        "datasetId": dataset_id,
        "lastActivity": project.updated_at.isoformat(),
    }


def dataset_output(dataset: Dataset) -> dict[str, Any]:
    return {
        "id": dataset.id,
        "projectId": dataset.project_id,
        "name": dataset.name,
        "description": dataset.description,
        "format": dataset.format,
        "size": bytes_label(dataset.size_bytes),
        "sizeBytes": dataset.size_bytes,
        "storagePath": dataset.storage_path,
        "rows": dataset.rows_count,
        "status": dataset.status,
        "trainSplit": dataset.train_split,
        "valSplit": dataset.val_split,
        "targetColumn": dataset.target_column,
        "featureColumns": dataset.feature_columns,
        "sequenceLength": dataset.sequence_length,
        "uploadedAt": dataset.uploaded_at.isoformat(),
    }


def _read_csv_preview(path: Path, limit: int) -> dict[str, Any]:
    records: list[dict[str, Any]] = []
    preview_bytes = 0
    has_more = False
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            sample = source.read(8192)
            if not sample.strip():
                raise HTTPException(status_code=422, detail="El archivo CSV está vacío.")
            source.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(source, dialect=dialect, restkey="__extra_columns__")
            columns = reader.fieldnames or []
            if not columns:
                raise HTTPException(
                    status_code=422,
                    detail="El archivo CSV no tiene encabezados de columnas.",
                )
            for row in reader:
                record = {
                    str(column): value
                    for column, value in row.items()
                    if column is not None
                }
                if None in row:
                    record["__extra_columns__"] = row[None]
                record_size = sum(
                    len(column) + len(value if isinstance(value, str) else "")
                    for column, value in record.items()
                )
                if preview_bytes + record_size > max_dataset_preview_bytes:
                    has_more = True
                    if not records:
                        raise HTTPException(
                            status_code=413,
                            detail="La primera fila supera el tamaño máximo de la vista previa.",
                        )
                    break
                records.append(record)
                preview_bytes += record_size
                if len(records) >= limit:
                    has_more = next(reader, None) is not None
                    break
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=422,
            detail="No se pudo leer el CSV como UTF-8. Guarda el archivo con codificación UTF-8.",
        ) from error
    except csv.Error as error:
        raise HTTPException(
            status_code=422,
            detail="El archivo CSV tiene un formato no válido.",
        ) from error

    return {
        "columns": columns,
        "records": records,
        "rowsReturned": len(records),
        "hasMore": has_more,
    }


def architecture_output(architecture: Architecture) -> dict[str, Any]:
    return {
        "id": architecture.id,
        "projectId": architecture.project_id,
        "name": architecture.name,
        "family": architecture.family,
        "description": architecture.description,
        "inputShape": architecture.input_shape,
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
        "modelFamily": architecture.family if architecture else "",
        "status": job.status,
        "progress": job.progress,
        "epoch": job.epoch,
        "totalEpochs": job.total_epochs,
        "loss": str(job.loss) if job.loss is not None else "—",
        "accuracy": f"{job.accuracy:.1%}" if job.accuracy is not None else "—",
        "precision": job.precision,
        "recall": job.recall,
        "f1Score": job.f1_score,
        "confusionMatrix": job.confusion_matrix,
        "errorMessage": job.error_message,
        "configuration": job.configuration,
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
        "format": model.format,
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
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER")),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    dataset = owned_or_404(db, Dataset, payload.dataset_id, owner_id)
    if dataset.project_id is not None:
        raise HTTPException(
            status_code=409,
            detail="El dataset ya está asociado a otro proyecto.",
        )
    if dataset.status != "READY":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden asociar datasets listos a un proyecto.",
        )
    objective = payload.objective.strip()
    if not objective:
        raise HTTPException(status_code=422, detail="El objetivo es obligatorio.")
    project = Project(
        owner_id=owner_id,
        name=payload.name.strip(),
        description=payload.description.strip(),
        objective=objective,
        model_family=payload.model_family,
    )
    db.add(project)
    db.flush()
    dataset.project_id = project.id
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
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER")),
) -> dict[str, Any]:
    project = owned_or_404(db, Project, project_id, get_user_id(user))
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        updates["name"] = (updates["name"] or "").strip()
        if not updates["name"]:
            raise HTTPException(status_code=422, detail="El nombre es obligatorio.")
    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Los campos enviados no pueden ser nulos.",
        )
    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()
    if "objective" in updates:
        updates["objective"] = updates["objective"].strip()
        if not updates["objective"]:
            raise HTTPException(status_code=422, detail="El objetivo es obligatorio.")
    if (
        updates.get("model_family")
        and updates["model_family"] != project.model_family
        and (
            db.scalar(
                select(func.count(Architecture.id)).where(
                    Architecture.project_id == project.id
                )
            )
            or 0
        )
    ):
        raise HTTPException(
            status_code=409,
            detail="No se puede cambiar la familia del proyecto cuando ya tiene arquitecturas.",
        )
    for key, value in updates.items():
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
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER")),
) -> None:
    project = owned_or_404(db, Project, project_id, get_user_id(user))
    project.status = "ARCHIVED"
    project.updated_at = datetime.now(timezone.utc)
    add_audit(db, project.owner_id, get_user_email(user), "project.archived", project.id)
    db.commit()


@router.delete(
    "/projects/{project_id}/permanent", status_code=status.HTTP_204_NO_CONTENT
)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_admin),
) -> None:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    if db.scalar(
        select(func.count(TrainingJob.id)).where(TrainingJob.project_id == project.id)
    ):
        raise HTTPException(
            status_code=409,
            detail="Elimina primero los entrenamientos asociados al proyecto.",
        )
    if db.scalar(
        select(func.count(ModelVersion.id)).where(
            ModelVersion.project_id == project.id
        )
    ):
        raise HTTPException(
            status_code=409,
            detail="Elimina primero los modelos asociados al proyecto.",
        )

    db.execute(
        update(Dataset)
        .where(Dataset.project_id == project.id)
        .values(project_id=None)
    )
    db.execute(
        update(Architecture)
        .where(Architecture.project_id == project.id)
        .values(project_id=None)
    )
    db.execute(
        update(GeneratedReport)
        .where(GeneratedReport.project_id == project.id)
        .values(project_id=None)
    )
    add_audit(db, project.owner_id, get_user_email(user), "project.deleted", project.id)
    db.delete(project)
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


@router.get("/datasets/{dataset_id}/preview")
def preview_dataset(
    dataset_id: str,
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    dataset = owned_or_404(db, Dataset, dataset_id, get_user_id(user))
    if dataset.format != "CSV":
        raise HTTPException(
            status_code=415,
            detail="La vista previa de registros está disponible para archivos CSV.",
        )
    storage_name = dataset.storage_path or ""
    owner_directory = hashlib.sha256(get_user_id(user).encode("utf-8")).hexdigest()
    storage_parts = storage_name.split("/")
    is_huggingface_path = (
        len(storage_parts) == 3
        and storage_parts[0] == "huggingface"
        and storage_parts[1] == owner_directory
    )
    is_legacy_path = (
        len(storage_parts) == 2 and storage_parts[0] == owner_directory
    )
    if (not is_huggingface_path and not is_legacy_path) or "\\" in storage_name:
        raise HTTPException(status_code=404, detail="No se encontró el archivo del dataset.")

    settings = get_settings()
    if is_huggingface_path:
        with tempfile.TemporaryDirectory(prefix="neurolab-preview-") as directory:
            preview_file = Path(directory) / "dataset.csv"
            try:
                huggingface_storage.download_file(storage_name, preview_file, settings)
            except Exception as error:
                logger.exception(
                    "No se pudo descargar el dataset %s de Hugging Face para previsualizarlo.",
                    dataset.id,
                )
                raise HTTPException(
                    status_code=502,
                    detail="No se pudo recuperar el archivo del almacenamiento.",
                ) from error
            return _read_csv_preview(preview_file, limit)

    if getattr(settings, "s3_bucket", None):
        with tempfile.TemporaryDirectory(prefix="neurolab-preview-") as directory:
            preview_file = Path(directory) / "dataset.csv"
            try:
                download_object_file(storage_name, preview_file, settings)
            except Exception as error:
                logger.exception("No se pudo descargar el dataset %s para previsualizarlo.", dataset.id)
                raise HTTPException(
                    status_code=502,
                    detail="No se pudo recuperar el archivo del almacenamiento.",
                ) from error
            return _read_csv_preview(preview_file, limit)

    storage_dir = settings.dataset_storage_dir.resolve()
    owner_storage_dir = (storage_dir / owner_directory).resolve()
    preview_file = (owner_storage_dir / storage_parts[1]).resolve()
    if preview_file.parent != owner_storage_dir or not preview_file.is_file():
        raise HTTPException(status_code=404, detail="No se encontró el archivo del dataset.")
    return _read_csv_preview(preview_file, limit)


@router.post("/datasets", status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: DatasetCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER", "AI_ENGINEER")),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    project = verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    if project and project.status == "ARCHIVED":
        raise HTTPException(
            status_code=409,
            detail="No se pueden agregar datasets a un proyecto archivado.",
        )
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio.")
    dataset_values = payload.model_dump(exclude={"rows"})
    dataset_values["name"] = name
    dataset_values["description"] = dataset_values["description"].strip()
    dataset_values["feature_columns"] = [
        column.strip() for column in dataset_values["feature_columns"]
    ]
    target_column = dataset_values["target_column"]
    dataset_values["target_column"] = target_column.strip() if target_column and target_column.strip() else None
    if (
        dataset_values["target_column"]
        and dataset_values["target_column"] in dataset_values["feature_columns"]
    ):
        raise HTTPException(
            status_code=422,
            detail="La columna objetivo no puede estar entre las características.",
        )
    dataset = Dataset(
        owner_id=owner_id,
        rows_count=payload.rows,
        **dataset_values,
    )
    db.add(dataset)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "dataset.created", dataset.id)
    db.commit()
    db.refresh(dataset)
    return dataset_output(dataset)


@router.post("/datasets/upload", status_code=status.HTTP_201_CREATED)
def upload_dataset(
    file: UploadFile = File(...),
    project_id: str | None = Form(default=None, alias="projectId"),
    description: str = Form(default="", max_length=4000),
    train_split: float = Form(default=0.8, alias="trainSplit", ge=0, le=1),
    val_split: float = Form(default=0.2, alias="valSplit", ge=0, le=1),
    target_column: str | None = Form(default=None, alias="targetColumn", max_length=255),
    feature_columns: str = Form(default="", alias="featureColumns"),
    sequence_length: int | None = Form(default=None, alias="sequenceLength", ge=1, le=1000000),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER", "AI_ENGINEER")),
) -> dict[str, Any]:
    filename = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    extension = Path(filename).suffix.lower()
    if not filename or len(filename) > 255 or extension not in dataset_formats:
        raise HTTPException(
            status_code=400,
            detail="Selecciona un archivo CSV, JSON, ZIP, TXT o una imagen PNG, JPG, JPEG, WEBP, BMP, GIF, TIF o TIFF con nombre válido.",
        )
    if train_split + val_split > 1:
        raise HTTPException(
            status_code=422,
            detail="La suma de trainSplit y valSplit no puede superar 1.",
        )
    parsed_feature_columns = list(
        dict.fromkeys(
            column.strip()
            for column in feature_columns.split(",")
            if column.strip()
        )
    )
    target_column = target_column.strip() if target_column and target_column.strip() else None
    if target_column and target_column in parsed_feature_columns:
        raise HTTPException(
            status_code=422,
            detail="La columna objetivo no puede estar entre las características.",
        )

    owner_id = get_user_id(user)
    project = verify_owned(db, Project, project_id, owner_id, "Proyecto")
    if project and project.status == "ARCHIVED":
        raise HTTPException(
            status_code=409,
            detail="No se pueden agregar datasets a un proyecto archivado.",
        )
    settings = get_settings()
    try:
        use_huggingface_storage = huggingface_storage.is_configured(settings)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    use_object_storage = (
        not use_huggingface_storage and is_object_storage_configured(settings)
    )
    settings = get_settings()
    storage_dir = settings.dataset_storage_dir
    owner_directory = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    owner_storage_dir = storage_dir / owner_directory
    owner_storage_dir.mkdir(parents=True, exist_ok=True)
    filename_on_disk = f"{uuid.uuid4().hex}{extension}"
    storage_name = (
        f"huggingface/{owner_directory}/{filename_on_disk}"
        if use_huggingface_storage
        else f"{owner_directory}/{filename_on_disk}"
    )
    storage_file = owner_storage_dir / filename_on_disk
    size_bytes = 0

    try:
        with storage_file.open("xb") as destination:
            while chunk := file.file.read(1024 * 1024):
                size_bytes += len(chunk)
                destination.write(chunk)
    except OSError as error:
        try:
            storage_file.unlink(missing_ok=True)
        except OSError:
            logger.exception("No se pudo limpiar el archivo de dataset %s", storage_file)
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el archivo del dataset.",
        ) from error
    except Exception:
        storage_file.unlink(missing_ok=True)
        raise

    if use_huggingface_storage:
        try:
            huggingface_storage.upload_file(storage_file, storage_name, settings)
        except Exception as error:
            logger.exception("No se pudo subir el dataset a Hugging Face.")
            storage_file.unlink(missing_ok=True)
            raise HTTPException(
                status_code=502,
                detail="No se pudo guardar el archivo en Hugging Face.",
            ) from error
        storage_file.unlink(missing_ok=True)
    if use_object_storage:
        try:
            upload_object_file(storage_file, storage_name, settings)
        except Exception as error:
            logger.exception("No se pudo subir el dataset a S3.")
            storage_file.unlink(missing_ok=True)
            raise HTTPException(
                status_code=502,
                detail="No se pudo guardar el archivo en el almacenamiento de objetos.",
            ) from error
        storage_file.unlink(missing_ok=True)

    try:
        dataset = Dataset(
            owner_id=owner_id,
            project_id=project_id,
            name=filename,
            format=dataset_formats[extension],
            size_bytes=size_bytes,
            description=description.strip(),
            train_split=train_split,
            val_split=val_split,
            target_column=target_column,
            feature_columns=parsed_feature_columns,
            sequence_length=sequence_length,
            storage_path=storage_name,
        )
        db.add(dataset)
        db.flush()
        add_audit(db, owner_id, get_user_email(user), "dataset.created", dataset.id)
        db.commit()
        db.refresh(dataset)
    except Exception:
        db.rollback()
        if use_huggingface_storage:
            try:
                huggingface_storage.delete_file(storage_name, settings)
            except Exception:
                logger.exception(
                    "No se pudo limpiar el dataset %s de Hugging Face.", storage_name
                )
        elif use_object_storage:
            try:
                delete_object_file(storage_name)
            except Exception:
                logger.exception("No se pudo limpiar el objeto de dataset %s", storage_name)
        else:
            try:
                storage_file.unlink(missing_ok=True)
            except OSError:
                logger.exception("No se pudo limpiar el archivo de dataset %s", storage_file)
        raise
    return dataset_output(dataset)


@router.get("/datasets/worker/{dataset_id}/download")
def download_dataset_for_worker(
    dataset_id: str,
    db: Session = Depends(get_db),
    _worker: None = Depends(require_worker),
) -> FileResponse:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset no encontrado.")
    settings = get_settings()
    storage_name = dataset.storage_path or ""
    owner_directory = hashlib.sha256(dataset.owner_id.encode("utf-8")).hexdigest()
    storage_parts = storage_name.split("/")
    if (
        len(storage_parts) != 3
        or storage_parts[0] != "huggingface"
        or storage_parts[1] != owner_directory
        or "\\" in storage_name
    ):
        raise HTTPException(status_code=404, detail="No se encontró el archivo del dataset.")
    try:
        hf_storage_active = huggingface_storage.is_configured(settings)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    if not hf_storage_active:
        raise HTTPException(
            status_code=503,
            detail="Hugging Face no está configurado para recuperar el dataset.",
        )

    file_descriptor, temporary_path = tempfile.mkstemp(
        prefix="neurolab-worker-dataset-",
        suffix=Path(storage_parts[2]).suffix,
    )
    os.close(file_descriptor)
    temporary_file = Path(temporary_path)
    try:
        huggingface_storage.download_file(storage_name, temporary_file, settings)
    except Exception as error:
        temporary_file.unlink(missing_ok=True)
        logger.exception(
            "No se pudo recuperar el dataset %s para el worker.", dataset.id
        )
        raise HTTPException(
            status_code=502,
            detail="No se pudo recuperar el archivo del almacenamiento.",
        ) from error

    return FileResponse(
        temporary_file,
        filename=Path(storage_parts[2]).name,
        background=BackgroundTask(temporary_file.unlink, missing_ok=True),
    )


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER", "AI_ENGINEER")),
) -> None:
    dataset = owned_or_404(db, Dataset, dataset_id, get_user_id(user))
    if db.scalar(
        select(func.count(TrainingJob.id)).where(TrainingJob.dataset_id == dataset.id)
    ):
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar un dataset utilizado por entrenamientos.",
        )
    if dataset.project_id and (
        db.scalar(
            select(func.count(Dataset.id)).where(
                Dataset.project_id == dataset.project_id
            )
        )
        or 0
    ) <= 1:
        raise HTTPException(
            status_code=409,
            detail="El proyecto debe conservar al menos un dataset asociado.",
        )
    storage_name = dataset.storage_path or ""
    settings = get_settings()
    if storage_name.startswith("huggingface/"):
        try:
            if not huggingface_storage.is_configured(settings):
                raise RuntimeError("Hugging Face no está configurado.")
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        try:
            huggingface_storage.delete_file(storage_name, settings)
        except Exception as error:
            logger.exception("No se pudo eliminar el dataset de Hugging Face.")
            raise HTTPException(
                status_code=502,
                detail="No se pudo eliminar el archivo de Hugging Face.",
            ) from error
        db.delete(dataset)
        db.commit()
        return

    if getattr(settings, "s3_bucket", None):
        db.delete(dataset)
        db.commit()
        try:
            delete_object_file(storage_name, settings)
        except Exception as error:
            logger.exception("No se pudo eliminar el objeto de dataset %s", storage_name)
            raise HTTPException(
                status_code=500,
                detail="Se eliminó el registro, pero no se pudo eliminar el archivo del dataset.",
            ) from error
        return

    storage_dir = settings.dataset_storage_dir.resolve()
    owner_directory = hashlib.sha256(get_user_id(user).encode("utf-8")).hexdigest()
    storage_parts = storage_name.split("/")
    storage_file: Path | None = None
    if (
        len(storage_parts) == 2
        and storage_parts[0] == owner_directory
        and "\\" not in storage_name
    ):
        owner_storage_dir = (storage_dir / owner_directory).resolve()
        candidate = (owner_storage_dir / storage_parts[1]).resolve()
        if candidate.parent == owner_storage_dir:
            storage_file = candidate
    db.delete(dataset)
    db.commit()
    if storage_file:
        try:
            storage_file.unlink(missing_ok=True)
        except OSError as error:
            raise HTTPException(
                status_code=500,
                detail="Se eliminó el registro, pero no se pudo eliminar el archivo del dataset.",
            ) from error


@router.patch("/datasets/{dataset_id}")
def update_dataset(
    dataset_id: str,
    payload: DatasetUpdate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("PROJECT_MANAGER", "AI_ENGINEER")),
) -> dict[str, Any]:
    dataset = owned_or_404(db, Dataset, dataset_id, get_user_id(user))
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        updates["name"] = (updates["name"] or "").strip()
        if not updates["name"]:
            raise HTTPException(status_code=422, detail="El nombre es obligatorio.")
    if "description" in updates and updates["description"] is not None:
        updates["description"] = updates["description"].strip()
    if "target_column" in updates and updates["target_column"] is not None:
        updates["target_column"] = updates["target_column"].strip() or None
    if "feature_columns" in updates and updates["feature_columns"] is not None:
        updates["feature_columns"] = list(
            dict.fromkeys(column.strip() for column in updates["feature_columns"] if column.strip())
        )
    if any(
        value is None
        for key, value in updates.items()
        if key not in {"target_column", "sequence_length"}
    ):
        raise HTTPException(
            status_code=422,
            detail="Los campos enviados no pueden ser nulos.",
        )
    train_split = updates.get("train_split", dataset.train_split)
    val_split = updates.get("val_split", dataset.val_split)
    if train_split + val_split > 1:
        raise HTTPException(
            status_code=422,
            detail="La suma de trainSplit y valSplit no puede superar 1.",
        )
    target_column = updates.get("target_column", dataset.target_column)
    feature_columns = updates.get("feature_columns", dataset.feature_columns)
    if target_column and target_column in feature_columns:
        raise HTTPException(
            status_code=422,
            detail="La columna objetivo no puede estar entre las características.",
        )
    for key, value in updates.items():
        setattr(dataset, key, value)
    db.commit()
    db.refresh(dataset)
    return dataset_output(dataset)


@router.get("/architectures")
def list_architectures(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    statement = (
        select(Architecture)
        .where(
            Architecture.owner_id == owner_id,
            Architecture.family.in_(("CNN", "RNN")),
        )
        .order_by(Architecture.updated_at.desc())
    )
    count_statement = select(func.count(Architecture.id)).where(
        Architecture.owner_id == owner_id,
        Architecture.family.in_(("CNN", "RNN")),
    )
    page = paginated(
        db,
        statement,
        count_statement,
        limit,
        offset,
    )
    return {**page, "items": [architecture_output(item) for item in page["items"]]}


@router.post("/architectures", status_code=status.HTTP_201_CREATED)
def create_architecture(
    payload: ArchitectureCreate,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    project = verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    if project and project.status == "ARCHIVED":
        raise HTTPException(
            status_code=409,
            detail="No se pueden agregar arquitecturas a un proyecto archivado.",
        )
    if project and payload.family != project.model_family:
        raise HTTPException(
            status_code=409,
            detail="La familia de la arquitectura debe coincidir con la del proyecto.",
        )
    layer_data = [layer.model_dump(by_alias=True) for layer in payload.layers]
    layer_errors = architecture_layer_errors(
        payload.family, layer_data, payload.input_shape
    )
    if layer_errors:
        raise HTTPException(status_code=422, detail=layer_errors)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio.")
    architecture_data = payload.model_dump(exclude={"layers"})
    architecture_data["name"] = name
    architecture = Architecture(
        owner_id=owner_id,
        layers=layer_data,
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
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> dict[str, Any]:
    architecture = owned_or_404(
        db, Architecture, architecture_id, get_user_id(user)
    )
    updates = payload.model_dump(exclude_unset=True, exclude={"layers"})
    if "name" in updates:
        updates["name"] = (updates["name"] or "").strip()
        if not updates["name"]:
            raise HTTPException(status_code=422, detail="El nombre es obligatorio.")
    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Los campos enviados no pueden ser nulos.",
        )
    next_family = updates.get("family", architecture.family)
    next_layers = (
        [layer.model_dump(by_alias=True) for layer in payload.layers]
        if payload.layers is not None
        else architecture.layers
    )
    next_input_shape = updates.get("input_shape", architecture.input_shape)
    layer_errors = architecture_layer_errors(
        next_family, next_layers, next_input_shape
    )
    if layer_errors:
        raise HTTPException(status_code=422, detail=layer_errors)
    project = owned_or_404(
        db, Project, architecture.project_id, get_user_id(user)
    )
    if next_family != project.model_family:
        raise HTTPException(
            status_code=409,
            detail="La familia de la arquitectura debe coincidir con la del proyecto.",
        )
    for key, value in updates.items():
        setattr(architecture, key, value)
    if payload.layers is not None:
        architecture.layers = next_layers
    architecture.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(architecture)
    return architecture_output(architecture)


@router.delete("/architectures/{architecture_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_architecture(
    architecture_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> None:
    architecture = owned_or_404(
        db, Architecture, architecture_id, get_user_id(user)
    )
    in_use = db.scalar(
        select(func.count(TrainingJob.id)).where(
            TrainingJob.architecture_id == architecture.id
        )
    ) or 0
    in_models = db.scalar(
        select(func.count(ModelVersion.id)).where(
            ModelVersion.architecture_id == architecture.id
        )
    ) or 0
    if in_use or in_models:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar una arquitectura asociada a entrenamientos o modelos.",
        )
    db.delete(architecture)
    db.commit()


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
    errors = architecture_layer_errors(
        architecture.family, layers, architecture.input_shape
    )
    if len(layers) < 3 and not errors:
        errors.append("La arquitectura debe tener al menos una capa oculta.")
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
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    project = verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    dataset = verify_owned(db, Dataset, payload.dataset_id, owner_id, "Dataset")
    architecture = verify_owned(
        db, Architecture, payload.architecture_id, owner_id, "Arquitectura"
    )
    if dataset.project_id != project.id:
        raise HTTPException(
            status_code=409,
            detail="El dataset no pertenece al proyecto seleccionado.",
        )
    if architecture.project_id != project.id:
        raise HTTPException(
            status_code=409,
            detail="La arquitectura no pertenece al proyecto seleccionado.",
        )
    if architecture.family != project.model_family:
        raise HTTPException(
            status_code=409,
            detail="La familia de la arquitectura no coincide con la del proyecto.",
        )
    if dataset.status != "READY":
        raise HTTPException(status_code=409, detail="El dataset no está listo.")
    if project.status == "ARCHIVED":
        raise HTTPException(status_code=409, detail="El proyecto está archivado.")
    job_values = payload.model_dump(exclude={"configuration"})
    job_values["configuration"] = payload.configuration.model_dump(by_alias=True)
    job = TrainingJob(owner_id=owner_id, **job_values)
    db.add(job)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "training.queued", job.id)
    db.commit()
    db.refresh(job)
    return training_output(db, job)


@router.delete("/training-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_training_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> None:
    job = (
        db.get(TrainingJob, job_id)
        if user.get("role") == "ADMIN"
        else owned_or_404(db, TrainingJob, job_id, get_user_id(user))
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")
    if job.status == "RUNNING":
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar un entrenamiento que está ejecutándose.",
        )
    if job.status == "COMPLETED" and user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=409,
            detail="Solo un administrador puede eliminar entrenamientos completados.",
        )
    if job.status not in {"QUEUED", "FAILED", "CANCELLED", "COMPLETED"}:
        raise HTTPException(
            status_code=409,
            detail="El estado actual no permite eliminar este entrenamiento.",
        )
    add_audit(db, job.owner_id, get_user_email(user), "training.deleted", job.id)
    db.delete(job)
    db.commit()


@router.post("/training-jobs/{job_id}/start", status_code=status.HTTP_202_ACCEPTED)
def restart_training_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> dict[str, Any]:
    job = owned_or_404(db, TrainingJob, job_id, get_user_id(user))
    if job.status != "FAILED":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden iniciar de nuevo trabajos fallidos.",
        )

    project = owned_or_404(db, Project, job.project_id, get_user_id(user))
    dataset = owned_or_404(db, Dataset, job.dataset_id, get_user_id(user))
    architecture = owned_or_404(
        db, Architecture, job.architecture_id, get_user_id(user)
    )
    if dataset.project_id != project.id or architecture.project_id != project.id:
        raise HTTPException(
            status_code=409,
            detail="El dataset y la arquitectura deben pertenecer al proyecto del entrenamiento.",
        )
    if project.status == "ARCHIVED" or dataset.status != "READY":
        raise HTTPException(
            status_code=409,
            detail="El proyecto debe estar activo y el dataset listo para iniciar el entrenamiento.",
        )
    if architecture.family != project.model_family:
        raise HTTPException(
            status_code=409,
            detail="La familia de la arquitectura no coincide con la del proyecto.",
        )
    if dataset.format != "CSV":
        raise HTTPException(
            status_code=409,
            detail="El worker de entrenamiento actualmente requiere un dataset CSV numérico.",
        )
    if not dataset.target_column:
        raise HTTPException(
            status_code=409,
            detail="Edita el dataset y define su columna objetivo antes de volver a iniciar el entrenamiento.",
        )

    db.execute(delete(TrainingMetric).where(TrainingMetric.job_id == job.id))
    job.status = "QUEUED"
    job.progress = 0
    job.epoch = 0
    job.loss = None
    job.accuracy = None
    job.precision = None
    job.recall = None
    job.f1_score = None
    job.confusion_matrix = None
    job.error_message = None
    job.started_at = datetime.now(timezone.utc)
    add_audit(db, job.owner_id, get_user_email(user), "training.requeued", job.id)
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


@router.post("/training-jobs/worker/claim")
def claim_training_job(
    db: Session = Depends(get_db),
    _worker: None = Depends(require_worker),
) -> dict[str, Any]:
    job = db.scalar(
        select(TrainingJob)
        .where(TrainingJob.status == "QUEUED")
        .order_by(TrainingJob.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if job is None:
        return {"job": None}

    project = db.get(Project, job.project_id)
    dataset = db.get(Dataset, job.dataset_id)
    architecture = db.get(Architecture, job.architecture_id)
    if project is None or dataset is None or architecture is None:
        job.status = "FAILED"
        job.error_message = "El trabajo referencia recursos que ya no existen."
        db.commit()
        return {"job": None}

    settings = get_settings()
    if (dataset.storage_path or "").startswith("huggingface/"):
        try:
            if not huggingface_storage.is_configured(settings):
                raise RuntimeError("Hugging Face no está configurado.")
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
        storage_provider = "huggingface"
    elif is_object_storage_configured(settings):
        storage_provider = "s3"
    else:
        storage_provider = "local"

    job.status = "RUNNING"
    job.progress = 0
    job.epoch = 0
    job.error_message = None
    job.started_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "job": {
            "id": job.id,
            "totalEpochs": job.total_epochs,
            "configuration": job.configuration,
            "projectId": project.id,
            "projectName": project.name,
            "dataset": {
                "id": dataset.id,
                "format": dataset.format,
                "storagePath": dataset.storage_path,
                "storageProvider": storage_provider,
                "trainSplit": dataset.train_split,
                "valSplit": dataset.val_split,
                "targetColumn": dataset.target_column,
                "featureColumns": dataset.feature_columns,
                "sequenceLength": dataset.sequence_length,
            },
            "architecture": architecture_output(architecture),
        }
    }


@router.post("/training-jobs/{job_id}/complete")
def complete_training_job(
    job_id: str,
    payload: TrainingComplete,
    db: Session = Depends(get_db),
    _worker: None = Depends(require_worker),
) -> dict[str, Any]:
    job = db.scalar(
        select(TrainingJob)
        .where(TrainingJob.id == job_id)
        .with_for_update()
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Trabajo de entrenamiento no encontrado.")
    if job.status != "RUNNING":
        raise HTTPException(status_code=409, detail="El trabajo no está en ejecución.")
    architecture = db.get(Architecture, job.architecture_id)
    if architecture is None:
        raise HTTPException(status_code=409, detail="La arquitectura del trabajo ya no existe.")

    model = ModelVersion(
        owner_id=job.owner_id,
        project_id=job.project_id,
        architecture_id=job.architecture_id,
        name=architecture.name,
        version=f"job-{job.id[:8]}",
        status="DRAFT",
        accuracy=payload.val_accuracy,
        size_bytes=payload.size_bytes,
        format="KERAS",
        checksum=payload.checksum,
        artifact_path=payload.artifact_path,
        created_by="training-worker",
    )
    job.status = "COMPLETED"
    job.progress = 100
    job.accuracy = payload.val_accuracy
    job.precision = payload.precision
    job.recall = payload.recall
    job.f1_score = payload.f1_score
    job.confusion_matrix = payload.confusion_matrix
    job.error_message = None
    db.add(model)
    db.flush()
    add_audit(db, job.owner_id, "training-worker", "training.completed", job.id)
    add_audit(db, job.owner_id, "training-worker", "model.created", model.id)
    db.commit()
    return {"jobId": job.id, "status": job.status, "modelId": model.id}


@router.post("/training-jobs/{job_id}/fail")
def fail_training_job(
    job_id: str,
    payload: TrainingFailure,
    db: Session = Depends(get_db),
    _worker: None = Depends(require_worker),
) -> dict[str, Any]:
    job = db.scalar(
        select(TrainingJob)
        .where(TrainingJob.id == job_id)
        .with_for_update()
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Trabajo de entrenamiento no encontrado.")
    if job.status not in {"QUEUED", "RUNNING"}:
        raise HTTPException(status_code=409, detail="El trabajo ya terminó.")
    job.status = "FAILED"
    job.error_message = payload.error.strip()[:2000]
    add_audit(db, job.owner_id, "training-worker", "training.failed", job.id)
    db.commit()
    return {"jobId": job.id, "status": job.status}


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
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    project = verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    architecture = verify_owned(
        db, Architecture, payload.architecture_id, owner_id, "Arquitectura"
    )
    if architecture.project_id != project.id:
        raise HTTPException(
            status_code=409,
            detail="La arquitectura no pertenece al proyecto seleccionado.",
        )
    if architecture.family != project.model_family:
        raise HTTPException(
            status_code=409,
            detail="La familia del modelo debe coincidir con la del proyecto.",
        )
    if project.status == "ARCHIVED":
        raise HTTPException(status_code=409, detail="El proyecto está archivado.")
    name = payload.name.strip()
    version = payload.version.strip()
    if not name or not version:
        raise HTTPException(
            status_code=422,
            detail="El nombre y la versión son obligatorios.",
        )
    model_data = payload.model_dump()
    model_data.update(name=name, version=version)
    model = ModelVersion(
        owner_id=owner_id,
        created_by=get_user_email(user),
        **model_data,
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
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER", "REVIEWER")),
) -> dict[str, Any]:
    model = owned_or_404(db, ModelVersion, model_id, get_user_id(user))
    if user["role"] == "REVIEWER" and payload.status != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="El rol REVIEWER solo puede aprobar modelos en revisión.",
        )
    if user["role"] == "AI_ENGINEER" and payload.status == "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Solo un REVIEWER puede aprobar un modelo.",
        )
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


@router.delete("/model-versions/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_version(
    model_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(require_roles("AI_ENGINEER")),
) -> None:
    model = owned_or_404(db, ModelVersion, model_id, get_user_id(user))
    if model.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden eliminar modelos en estado borrador.",
        )
    db.delete(model)
    db.commit()


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
    user: dict[str, Any] = Depends(
        require_roles("PROJECT_MANAGER", "AI_ENGINEER", "REVIEWER")
    ),
) -> dict[str, Any]:
    owner_id = get_user_id(user)
    verify_owned(db, Project, payload.project_id, owner_id, "Proyecto")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="El nombre del reporte es obligatorio.")
    report_data = payload.model_dump()
    report_data["name"] = name
    report = GeneratedReport(
        owner_id=owner_id,
        requested_by=get_user_email(user),
        **report_data,
    )
    db.add(report)
    db.flush()
    add_audit(db, owner_id, get_user_email(user), "report.requested", report.id)
    db.commit()
    db.refresh(report)
    return report_output(report)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(
        require_roles("PROJECT_MANAGER", "AI_ENGINEER", "REVIEWER")
    ),
) -> None:
    report = owned_or_404(db, GeneratedReport, report_id, get_user_id(user))
    if report.status not in {"GENERATING", "FAILED"}:
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden eliminar solicitudes pendientes o fallidas.",
        )
    db.delete(report)
    db.commit()


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
