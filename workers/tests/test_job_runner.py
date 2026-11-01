
import hashlib
import sys
from pathlib import Path
from types import SimpleNamespace

from training import job_runner
from training.config import WorkerSettings


class FakeCallback:
    pass


class FakeModel:
    def fit(self, *args, callbacks, **kwargs):
        for callback in callbacks:
            if hasattr(callback, "on_epoch_end"):
                callback.on_epoch_end(
                    0,
                    {
                        "loss": 0.4,
                        "val_loss": 0.5,
                        "accuracy": 0.8,
                        "val_accuracy": 0.75,
                    },
                )

    def evaluate(self, *args, **kwargs):
        return {"loss": 0.5, "accuracy": 0.75}

    def predict(self, *args, **kwargs):
        return [[0.8], [0.2]]

    def save(self, path):
        Path(path).write_bytes(b"keras-artifact")


class FakeTrainingClient:
    def __init__(self):
        self.metrics = []
        self.completions = []
        self.failures = []
        self.downloads = []

    def publish_metric(self, job_id, payload):
        self.metrics.append((job_id, payload))

    def complete(self, job_id, payload):
        self.completions.append((job_id, payload))

    def fail(self, job_id, message):
        self.failures.append((job_id, message))

    def download_dataset(self, dataset_id, destination):
        self.downloads.append((dataset_id, destination))
        destination.write_text("feature,label\n1,0\n", encoding="utf-8")


def test_runner_trains_publishes_and_registers_artifact(monkeypatch, tmp_path):
    class FakeEarlyStopping:
        def __init__(self, **kwargs):
            self.options = kwargs

    tensorflow = SimpleNamespace(
        keras=SimpleNamespace(
            callbacks=SimpleNamespace(
                Callback=FakeCallback,
                EarlyStopping=FakeEarlyStopping,
            )
        )
    )
    monkeypatch.setitem(sys.modules, "tensorflow", tensorflow)
    monkeypatch.setattr(
        job_runner,
        "load_csv_dataset",
        lambda *args: ("x-train", "y-train", "x-val", "y-val"),
    )
    monkeypatch.setattr(job_runner, "build_keras_model", lambda *args: FakeModel())
    monkeypatch.setattr(
        job_runner,
        "classification_metrics",
        lambda *args: {
            "precision": 0.8,
            "recall": 0.75,
            "f1_score": 0.77,
            "confusion_matrix": [[1, 0], [1, 2]],
        },
    )
    settings = WorkerSettings(
        api_url="http://localhost/api/v1",
        api_key="worker-secret",
        dataset_storage_dir=tmp_path / "datasets",
        model_storage_dir=tmp_path / "models",
        poll_interval_seconds=1,
    )
    client = FakeTrainingClient()
    job = {
        "id": "job-123",
        "totalEpochs": 2,
        "configuration": {
            "loss": "binary_crossentropy",
            "batchSize": 16,
            "earlyStopping": True,
            "patience": 3,
        },
        "dataset": {
            "id": "dataset-123",
            "format": "CSV",
            "storagePath": "huggingface/owner/dataset.csv",
            "storageProvider": "huggingface",
        },
        "architecture": {
            "name": "CNN",
            "layers": [{"type": "Output", "neurons": 1}],
        },
    }

    job_runner.TrainingJobRunner(client, settings).run(job)

    assert client.failures == []
    assert len(client.downloads) == 1
    assert client.downloads[0][0] == "dataset-123"
    assert client.downloads[0][1].name == "dataset.csv"
    assert client.metrics == [
        (
            "job-123",
            {
                "epoch": 1,
                "train_loss": 0.4,
                "val_loss": 0.5,
                "train_accuracy": 0.8,
                "val_accuracy": 0.75,
            },
        )
    ]
    assert client.completions[0][0] == "job-123"
    payload = client.completions[0][1]
    assert payload["val_accuracy"] == 0.75
    assert payload["precision"] == 0.8
    assert payload["recall"] == 0.75
    assert payload["f1_score"] == 0.77
    assert payload["confusion_matrix"] == [[1, 0], [1, 2]]
    assert payload["artifact_path"] == "job-123.keras"
    assert payload["checksum"] == hashlib.sha256(b"keras-artifact").hexdigest()
    assert (settings.model_storage_dir / "job-123.keras").read_bytes() == b"keras-artifact"
