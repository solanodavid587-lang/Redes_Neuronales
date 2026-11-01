import numpy as np

from training.ml.evaluation import classification_metrics


def test_classification_metrics_returns_macro_scores_and_confusion_matrix():
    result = classification_metrics(
        np.array([0, 0, 1, 1]),
        np.array([[0.9, 0.1], [0.2, 0.8], [0.3, 0.7], [0.75, 0.25]]),
        2,
    )

    assert result["confusion_matrix"] == [[1, 1], [1, 1]]
    assert result["precision"] == 0.5
    assert result["recall"] == 0.5
    assert result["f1_score"] == 0.5


def test_binary_one_unit_uses_probability_threshold():
    result = classification_metrics(
        np.array([[0], [1], [1]]),
        np.array([[0.1], [0.8], [0.2]]),
        2,
    )

    assert result["confusion_matrix"] == [[1, 0], [1, 1]]
    assert result["precision"] == 0.75
    assert result["recall"] == 0.75
    assert round(result["f1_score"], 4) == 0.6667
