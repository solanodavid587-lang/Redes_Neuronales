
import hashlib
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from training.api_client import ApiClient
from training.config import WorkerSettings
from training.ml.datasets.loader import load_csv_dataset
from training.ml.evaluation import classification_metrics
from training.ml.model_factory import build_keras_model
from training.object_storage import download_file, upload_file

logger = logging.getLogger(__name__)


def _save_artifact(model: Any, job_id: str, root: Path) -> dict[str, Any]:
    root.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", job_id)
    if not safe_id:
        raise ValueError("El trabajo no tiene un identificador válido.")
    artifact = root / f"{safe_id}.keras"
    temporary = root / f".{safe_id}.tmp.keras"
    try:
        model.save(temporary)
        os.replace(temporary, artifact)
    finally:
        temporary.unlink(missing_ok=True)

    checksum = hashlib.sha256()
    size_bytes = 0
    with artifact.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            checksum.update(chunk)
            size_bytes += len(chunk)
    return {
        "artifact_path": artifact.relative_to(root).as_posix(),
        "checksum": checksum.hexdigest(),
        "size_bytes": size_bytes,
    }


class TrainingJobRunner:
    def __init__(self, client: ApiClient, settings: WorkerSettings):
        self.client = client
        self.settings = settings

    def run(self, job: dict[str, Any]) -> None:
        job_id = str(job.get("id", ""))
        if not job_id:
            raise ValueError("La API entregó un trabajo sin identificador.")
        try:
            self._train(job_id, job)
        except Exception as error:
            logger.exception("Falló el entrenamiento del trabajo %s.", job_id)
            try:
                self.client.fail(job_id, str(error) or error.__class__.__name__)
            except Exception:
                logger.exception("No se pudo reportar el fallo del trabajo %s.", job_id)

    def _train(self, job_id: str, job: dict[str, Any]) -> None:
        import tensorflow as tf

        configuration = job["configuration"]
        architecture = job["architecture"]
        dataset = job["dataset"]
        if dataset.get("storageProvider") == "huggingface":
            with tempfile.TemporaryDirectory(prefix="neurolab-dataset-") as temporary_dir:
                dataset_path = Path(temporary_dir) / Path(dataset["storagePath"]).name
                self.client.download_dataset(dataset["id"], dataset_path)
                local_dataset = {**dataset, "storagePath": dataset_path.name}
                x_train, y_train, x_val, y_val = load_csv_dataset(
                    local_dataset,
                    architecture,
                    Path(temporary_dir),
                    configuration["loss"],
                )
        elif dataset.get("storageProvider") == "s3" or (
            dataset.get("storageProvider") is None and self.settings.s3_bucket
        ):
            with tempfile.TemporaryDirectory(prefix="neurolab-dataset-") as temporary_dir:
                dataset_path = Path(temporary_dir) / Path(dataset["storagePath"]).name
                download_file(self.settings, dataset["storagePath"], dataset_path)
                local_dataset = {**dataset, "storagePath": dataset_path.name}
                x_train, y_train, x_val, y_val = load_csv_dataset(
                    local_dataset,
                    architecture,
                    Path(temporary_dir),
                    configuration["loss"],
                )
        else:
            x_train, y_train, x_val, y_val = load_csv_dataset(
                dataset,
                architecture,
                self.settings.dataset_storage_dir,
                configuration["loss"],
            )
        model = build_keras_model(architecture, configuration)

        from training.ml.callbacks.metrics_publisher import create_metrics_publisher

        callbacks: list[Any] = [
            create_metrics_publisher(tf, self.client, job_id),
        ]
        if configuration.get("earlyStopping", True):
            callbacks.append(
                tf.keras.callbacks.EarlyStopping(
                    monitor="val_loss",
                    patience=int(configuration.get("patience", 5)),
                    restore_best_weights=True,
                )
            )

        model.fit(
            x_train,
            y_train,
            validation_data=(x_val, y_val),
            epochs=int(job["totalEpochs"]),
            batch_size=int(configuration["batchSize"]),
            callbacks=callbacks,
            verbose=0,
        )
        evaluation = model.evaluate(x_val, y_val, verbose=0, return_dict=True)
        val_accuracy = evaluation.get("accuracy")
        if val_accuracy is None:
            raise RuntimeError("TensorFlow no devolvió la métrica de validación accuracy.")
        artifact = _save_artifact(model, job_id, self.settings.model_storage_dir)
        completion_payload = {
            **artifact,
            "val_accuracy": float(val_accuracy),
        }
        if configuration["loss"] not in {
            "mean_squared_error",
            "mean_absolute_error",
        }:
            output_layer = next(
                layer
                for layer in reversed(architecture["layers"])
                if layer["type"] == "Output"
            )
            class_count = int(output_layer["neurons"])
            if configuration["loss"] == "binary_crossentropy" and class_count == 1:
                class_count = 2
            predictions = model.predict(x_val, verbose=0)
            completion_payload.update(
                classification_metrics(y_val, predictions, class_count)
            )
        if self.settings.s3_bucket:
            artifact_key = f"models/{Path(artifact['artifact_path']).name}"
            upload_file(
                self.settings,
                self.settings.model_storage_dir / artifact["artifact_path"],
                artifact_key,
            )
            completion_payload["artifact_path"] = artifact_key
        self.client.complete(
            job_id,
            completion_payload,
        )
