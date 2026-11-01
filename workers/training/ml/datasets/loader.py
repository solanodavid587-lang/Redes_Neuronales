import csv
import math
from pathlib import Path
from typing import Any

import numpy as np


def _safe_dataset_path(storage_root: Path, storage_path: str | None) -> Path:
    if not storage_path:
        raise ValueError("El dataset no tiene un archivo asociado.")
    root = storage_root.resolve()
    path = (root / storage_path).resolve()
    if root not in path.parents or not path.is_file():
        raise ValueError("La ruta del dataset no existe dentro del almacenamiento permitido.")
    return path


def _number(value: str, column: str, row_number: int) -> float:
    try:
        result = float(value)
    except ValueError as error:
        raise ValueError(
            f"La columna de entrada '{column}' debe contener solo números "
            f"(fila {row_number})."
        ) from error
    if not math.isfinite(result):
        raise ValueError(f"El dataset contiene un valor no finito en la fila {row_number}.")
    return result


def load_csv_dataset(
    dataset: dict[str, Any],
    architecture: dict[str, Any],
    storage_root: Path,
    loss: str,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if dataset.get("format") != "CSV":
        raise ValueError("El worker TensorFlow admite actualmente datasets CSV numéricos.")

    path = _safe_dataset_path(storage_root, dataset.get("storagePath"))
    target_column = (dataset.get("targetColumn") or "").strip()
    if not target_column:
        raise ValueError("Define la columna objetivo antes de iniciar el entrenamiento.")

    with path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        raw_headers = reader.fieldnames or []
        headers = [header.strip() for header in raw_headers]
        if not headers or target_column not in headers:
            raise ValueError("La columna objetivo no existe en el encabezado del CSV.")
        selected_features = dataset.get("featureColumns") or [
            header for header in headers if header != target_column
        ]
        features = [str(column).strip() for column in selected_features]
        if not features or target_column in features:
            raise ValueError("Selecciona columnas de entrada distintas a la columna objetivo.")
        if len(set(features)) != len(features):
            raise ValueError("No repitas columnas de entrada.")
        missing = [column for column in features if column not in headers]
        if missing:
            raise ValueError(f"Columnas de entrada inexistentes: {', '.join(missing)}.")
        rows = [
            {
                normalized: row.get(original, "")
                for original, normalized in zip(raw_headers, headers, strict=True)
            }
            for row in reader
        ]

    if len(rows) < 2:
        raise ValueError("Se requieren al menos dos filas de datos para entrenar.")
    inputs = np.asarray(
        [
            [_number((row.get(column) or "").strip(), column, index + 2) for column in features]
            for index, row in enumerate(rows)
        ],
        dtype=np.float32,
    )
    targets = [str((row.get(target_column) or "").strip()) for row in rows]
    if any(not target for target in targets):
        raise ValueError("La columna objetivo contiene valores vacíos.")

    family = architecture.get("family")
    expected_dimensions = {"CNN": 3, "RNN": 2}.get(family)
    if expected_dimensions is None:
        raise ValueError("Solo se pueden entrenar arquitecturas CNN o RNN.")
    input_shape = architecture.get("inputShape") or []
    if len(input_shape) != expected_dimensions:
        raise ValueError(
            f"La forma de entrada de {family} debe tener {expected_dimensions} dimensiones."
        )
    expected_size = math.prod(input_shape)
    if expected_size != inputs.shape[1]:
        raise ValueError(
            f"La forma {tuple(input_shape)} requiere {expected_size} características; "
            f"el CSV aporta {inputs.shape[1]}."
        )
    inputs = inputs.reshape((len(inputs), *input_shape))

    output_layer = next(
        (layer for layer in reversed(architecture["layers"]) if layer["type"] == "Output"),
        None,
    )
    output_units = int(output_layer["neurons"]) if output_layer else 0
    if loss in {"mean_squared_error", "mean_absolute_error"}:
        if output_units != 1:
            raise ValueError("Las pérdidas de regresión requieren una unidad de salida.")
        try:
            labels = np.asarray([float(value) for value in targets], dtype=np.float32)
        except ValueError as error:
            raise ValueError("La pérdida de regresión requiere una columna objetivo numérica.") from error
        if not np.isfinite(labels).all():
            raise ValueError("La columna objetivo contiene valores no finitos.")
        labels = labels.reshape(-1, 1)
    else:
        classes = sorted(set(targets))
        if loss == "binary_crossentropy" and len(classes) != 2:
            raise ValueError("Binary crossentropy requiere exactamente dos clases.")
        label_map = {label: index for index, label in enumerate(classes)}
        indices = np.asarray([label_map[label] for label in targets], dtype=np.int32)
        if loss == "categorical_crossentropy":
            if len(classes) != output_units:
                raise ValueError("Las clases deben coincidir con las unidades de salida.")
            labels = np.eye(len(classes), dtype=np.float32)[indices]
        elif loss == "binary_crossentropy":
            if output_units == 1:
                labels = indices.astype(np.float32).reshape(-1, 1)
            elif output_units == 2:
                labels = np.eye(2, dtype=np.float32)[indices]
            else:
                raise ValueError("Binary crossentropy requiere una o dos unidades de salida.")
        else:
            if len(classes) > output_units:
                raise ValueError("Hay más clases en el dataset que unidades de salida.")
            labels = indices

    train_split = float(dataset.get("trainSplit", 0))
    val_split = float(dataset.get("valSplit", 0))
    if train_split <= 0 or val_split <= 0 or train_split + val_split > 1:
        raise ValueError("El dataset debe tener divisiones de entrenamiento y validación positivas.")
    order = np.random.default_rng(42).permutation(len(inputs))
    train_count = int(len(order) * train_split / (train_split + val_split))
    train_count = min(max(train_count, 1), len(order) - 1)
    train_indices, val_indices = order[:train_count], order[train_count:]
    return (
        inputs[train_indices],
        labels[train_indices],
        inputs[val_indices],
        labels[val_indices],
    )
