
from typing import Any

import numpy as np


def classification_metrics(
    targets: np.ndarray,
    predictions: np.ndarray,
    class_count: int,
) -> dict[str, Any]:
    if class_count < 2:
        raise ValueError("La clasificación requiere al menos dos clases.")

    y_true = np.asarray(targets)
    if y_true.ndim > 1 and y_true.shape[-1] > 1:
        y_true = np.argmax(y_true, axis=-1)
    else:
        y_true = y_true.reshape(-1)
    y_true = y_true.astype(np.int64)

    scores = np.asarray(predictions)
    if scores.ndim == 1 or scores.shape[-1] == 1:
        y_pred = (scores.reshape(-1) >= 0.5).astype(np.int64)
    else:
        y_pred = np.argmax(scores, axis=-1).astype(np.int64)

    if y_true.shape != y_pred.shape:
        raise ValueError("Las predicciones y etiquetas de validación no coinciden.")
    if (
        (y_true < 0).any()
        or (y_true >= class_count).any()
        or (y_pred < 0).any()
        or (y_pred >= class_count).any()
    ):
        raise ValueError("El modelo produjo una clase fuera del rango esperado.")

    matrix = np.zeros((class_count, class_count), dtype=np.int64)
    np.add.at(matrix, (y_true, y_pred), 1)
    true_positives = np.diag(matrix).astype(np.float64)
    precision = true_positives / np.maximum(matrix.sum(axis=0), 1)
    recall = true_positives / np.maximum(matrix.sum(axis=1), 1)
    f1 = 2 * precision * recall / np.maximum(precision + recall, 1e-12)
    return {
        "precision": float(np.mean(precision)),
        "recall": float(np.mean(recall)),
        "f1_score": float(np.mean(f1)),
        "confusion_matrix": matrix.tolist(),
    }
