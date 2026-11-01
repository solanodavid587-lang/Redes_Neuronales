
import sys
from types import SimpleNamespace

from training.ml.model_factory import build_keras_model


class FakeSequential:
    def __init__(self, layers, name):
        self.layers = layers
        self.name = name
        self.compile_options = None

    def compile(self, **kwargs):
        self.compile_options = kwargs


def _install_fake_tensorflow(monkeypatch):
    created_layers = []

    def layer_factory(name):
        def create(*args, **kwargs):
            layer = {"name": name, "args": args, "kwargs": kwargs}
            created_layers.append(layer)
            return layer

        return create

    layers = SimpleNamespace(
        Input=layer_factory("Input"),
        Conv2D=layer_factory("Conv2D"),
        MaxPooling2D=layer_factory("MaxPooling2D"),
        Flatten=layer_factory("Flatten"),
        LSTM=layer_factory("LSTM"),
        GRU=layer_factory("GRU"),
        SimpleRNN=layer_factory("SimpleRNN"),
        Dense=layer_factory("Dense"),
        Dropout=layer_factory("Dropout"),
    )
    optimizers = SimpleNamespace(
        Adam=lambda **kwargs: ("adam", kwargs),
        SGD=lambda **kwargs: ("sgd", kwargs),
        RMSprop=lambda **kwargs: ("rmsprop", kwargs),
    )
    tensorflow = SimpleNamespace(
        keras=SimpleNamespace(
            utils=SimpleNamespace(set_random_seed=lambda seed: None),
            layers=layers,
            optimizers=optimizers,
            Sequential=FakeSequential,
        )
    )
    monkeypatch.setitem(sys.modules, "tensorflow", tensorflow)
    return created_layers


def test_factory_builds_compiled_keras_cnn(monkeypatch):
    created_layers = _install_fake_tensorflow(monkeypatch)

    model = build_keras_model(
        {
            "name": "CNN",
            "inputShape": [8, 8, 1],
            "layers": [
                {"type": "Input", "neurons": 1, "activation": "None"},
                {"type": "Conv2D", "neurons": 4, "activation": "relu"},
                {"type": "Flatten", "neurons": 1, "activation": "None"},
                {"type": "Output", "neurons": 2, "activation": "softmax"},
            ],
        },
        {
            "seed": 42,
            "optimizer": "adam",
            "learningRate": 0.001,
            "loss": "sparse_categorical_crossentropy",
        },
    )

    assert model.name == "CNN"
    assert [layer["name"] for layer in created_layers] == [
        "Input",
        "Conv2D",
        "Flatten",
        "Dense",
    ]
    assert created_layers[1]["kwargs"]["activation"] == "relu"
    assert created_layers[-1]["kwargs"]["activation"] == "softmax"
    assert model.compile_options["loss"] == "sparse_categorical_crossentropy"


def test_factory_builds_recurrent_keras_layer(monkeypatch):
    created_layers = _install_fake_tensorflow(monkeypatch)

    build_keras_model(
        {
            "name": "RNN",
            "inputShape": [5, 2],
            "layers": [
                {"type": "Input", "neurons": 1, "activation": "None"},
                {
                    "type": "LSTM",
                    "neurons": 8,
                    "activation": "tanh",
                    "returnSequences": False,
                },
                {"type": "Output", "neurons": 1, "activation": "sigmoid"},
            ],
        },
        {
            "seed": 42,
            "optimizer": "rmsprop",
            "learningRate": 0.001,
            "loss": "binary_crossentropy",
        },
    )

    recurrent = next(layer for layer in created_layers if layer["name"] == "LSTM")
    assert recurrent["kwargs"] == {
        "units": 8,
        "activation": "tanh",
        "return_sequences": False,
    }
