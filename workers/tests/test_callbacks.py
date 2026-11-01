
from types import SimpleNamespace

import pytest

from training.ml.callbacks.metrics_publisher import create_metrics_publisher


class FakeCallback:
    pass


class FakeClient:
    def __init__(self):
        self.payloads = []

    def publish_metric(self, job_id, payload):
        self.payloads.append((job_id, payload))


def test_metrics_publisher_maps_keras_logs_to_api_contract():
    tensorflow = SimpleNamespace(
        keras=SimpleNamespace(callbacks=SimpleNamespace(Callback=FakeCallback))
    )
    client = FakeClient()
    callback = create_metrics_publisher(tensorflow, client, "job-1")

    callback.on_epoch_end(
        2,
        {
            "loss": 0.3,
            "val_loss": 0.4,
            "accuracy": 0.9,
            "val_accuracy": 0.85,
        },
    )

    assert client.payloads == [
        (
            "job-1",
            {
                "epoch": 3,
                "train_loss": 0.3,
                "val_loss": 0.4,
                "train_accuracy": 0.9,
                "val_accuracy": 0.85,
            },
        )
    ]


def test_metrics_publisher_fails_if_keras_does_not_report_required_metrics():
    tensorflow = SimpleNamespace(
        keras=SimpleNamespace(callbacks=SimpleNamespace(Callback=FakeCallback))
    )
    callback = create_metrics_publisher(tensorflow, FakeClient(), "job-1")

    with pytest.raises(RuntimeError, match="val_accuracy"):
        callback.on_epoch_end(0, {"loss": 0.3, "val_loss": 0.4, "accuracy": 0.9})
