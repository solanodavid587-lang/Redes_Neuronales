from typing import Any

from training.api_client import ApiClient


def create_metrics_publisher(
    tensorflow: Any, client: ApiClient, job_id: str
) -> Any:
    class MetricsPublisher(tensorflow.keras.callbacks.Callback):
        def on_epoch_end(self, epoch: int, logs: dict[str, Any] | None = None) -> None:
            values = logs or {}
            required = ("loss", "val_loss", "accuracy", "val_accuracy")
            missing = [key for key in required if key not in values]
            if missing:
                raise RuntimeError(
                    "TensorFlow no reportó métricas requeridas: "
                    + ", ".join(missing)
                )
            client.publish_metric(
                job_id,
                {
                    "epoch": epoch + 1,
                    "train_loss": float(values["loss"]),
                    "val_loss": float(values["val_loss"]),
                    "train_accuracy": float(values["accuracy"]),
                    "val_accuracy": float(values["val_accuracy"]),
                },
            )

    return MetricsPublisher()
