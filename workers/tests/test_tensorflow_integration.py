import csv
import hashlib

import pytest

tf = pytest.importorskip("tensorflow")

from training.config import WorkerSettings
from training.job_runner import TrainingJobRunner


class RecordingClient:
    def __init__(self):
        self.metrics = []
        self.completions = []
        self.failures = []

    def publish_metric(self, job_id, payload):
        self.metrics.append((job_id, payload))

    def complete(self, job_id, payload):
        self.completions.append((job_id, payload))

    def fail(self, job_id, message):
        self.failures.append((job_id, message))


@pytest.mark.parametrize("family", ["CNN", "RNN"])
def test_tensorflow_runner_trains_and_serializes_real_models(tmp_path, family):
    dataset_root = tmp_path / "datasets"
    dataset_root.mkdir()
    dataset_file = dataset_root / "samples.csv"
    with dataset_file.open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["signal", "label"])
        writer.writerows(
            (index / 8, index % 2)
            for index in range(12)
        )

    settings = WorkerSettings(
        api_url="http://localhost/api/v1",
        api_key="test-key",
        dataset_storage_dir=dataset_root,
        model_storage_dir=tmp_path / "models",
        poll_interval_seconds=1,
    )
    client = RecordingClient()
    if family == "CNN":
        layers = [
            {"type": "Input", "neurons": 1, "activation": "None"},
            {
                "type": "Conv2D",
                "neurons": 2,
                "activation": "relu",
                "kernelSize": 1,
            },
            {"type": "Flatten", "neurons": 1, "activation": "None"},
            {"type": "Output", "neurons": 1, "activation": "sigmoid"},
        ]
        input_shape = [1, 1, 1]
    else:
        layers = [
            {"type": "Input", "neurons": 1, "activation": "None"},
            {
                "type": "SimpleRNN",
                "neurons": 2,
                "activation": "tanh",
                "returnSequences": False,
            },
            {"type": "Output", "neurons": 1, "activation": "sigmoid"},
        ]
        input_shape = [1, 1]
    job = {
        "id": f"integration-{family.lower()}",
        "totalEpochs": 1,
        "configuration": {
            "batchSize": 4,
            "learningRate": 0.001,
            "optimizer": "adam",
            "loss": "binary_crossentropy",
            "earlyStopping": False,
            "seed": 42,
        },
        "dataset": {
            "format": "CSV",
            "storagePath": "samples.csv",
            "targetColumn": "label",
            "featureColumns": ["signal"],
            "trainSplit": 0.75,
            "valSplit": 0.25,
        },
        "architecture": {
            "name": f"Integration {family}",
            "family": family,
            "inputShape": input_shape,
            "layers": layers,
        },
    }

    TrainingJobRunner(client, settings).run(job)

    assert client.failures == []
    assert len(client.metrics) == 1
    assert len(client.completions) == 1
    artifact = settings.model_storage_dir / f"integration-{family.lower()}.keras"
    assert artifact.is_file()
    completion = client.completions[0][1]
    assert completion["checksum"] == hashlib.sha256(artifact.read_bytes()).hexdigest()
    assert 0 <= completion["precision"] <= 1
    assert 0 <= completion["recall"] <= 1
    assert 0 <= completion["f1_score"] <= 1
    assert sum(map(sum, completion["confusion_matrix"])) == 3
    loaded_model = tf.keras.models.load_model(artifact)
    assert loaded_model.output_shape == (None, 1)
