import numpy as np
import pytest

from training.ml.datasets.loader import load_csv_dataset


def test_loader_normalizes_csv_headers_and_splits_rows(tmp_path):
    (tmp_path / "samples.csv").write_text(
        " feature_a ,feature_b,target\n1,10,no\n2,20,yes\n3,30,no\n4,40,yes\n",
        encoding="utf-8",
    )
    dataset = {
        "format": "CSV",
        "storagePath": "samples.csv",
        "targetColumn": "target",
        "featureColumns": ["feature_a", "feature_b"],
        "trainSplit": 0.75,
        "valSplit": 0.25,
    }
    architecture = {
        "family": "RNN",
        "inputShape": [2, 1],
        "layers": [{"type": "Output", "neurons": 2}],
    }

    x_train, y_train, x_val, y_val = load_csv_dataset(
        dataset, architecture, tmp_path, "sparse_categorical_crossentropy"
    )

    assert x_train.shape == (3, 2, 1)
    assert x_val.shape == (1, 2, 1)
    assert y_train.dtype == np.int32
    assert set(np.concatenate((y_train, y_val)).tolist()) == {0, 1}


def test_loader_rejects_storage_path_traversal(tmp_path):
    outside = tmp_path.parent / "outside.csv"
    outside.write_text("x,target\n1,a\n2,b\n", encoding="utf-8")
    dataset = {
        "format": "CSV",
        "storagePath": "../outside.csv",
        "targetColumn": "target",
        "featureColumns": ["x"],
    }

    with pytest.raises(ValueError, match="almacenamiento permitido"):
        load_csv_dataset(
            dataset,
            {"family": "RNN", "inputShape": [1, 1], "layers": []},
            tmp_path,
            "sparse_categorical_crossentropy",
        )
