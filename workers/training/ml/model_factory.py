import re
from typing import Any


def build_keras_model(
    architecture: dict[str, Any], configuration: dict[str, Any]
) -> Any:
    import tensorflow as tf

    tf.keras.utils.set_random_seed(int(configuration["seed"]))
    input_shape = tuple(architecture["inputShape"])
    layers: list[Any] = [tf.keras.layers.Input(shape=input_shape)]

    for spec in architecture["layers"]:
        layer_type = spec["type"]
        activation = None if spec["activation"] == "None" else spec["activation"]
        if layer_type == "Input":
            continue
        if layer_type == "Conv2D":
            layers.append(
                tf.keras.layers.Conv2D(
                    filters=int(spec["neurons"]),
                    kernel_size=int(spec.get("kernelSize", 3)),
                    activation=activation,
                )
            )
        elif layer_type == "MaxPooling2D":
            layers.append(tf.keras.layers.MaxPooling2D())
        elif layer_type == "Flatten":
            layers.append(tf.keras.layers.Flatten())
        elif layer_type in {"LSTM", "GRU", "SimpleRNN"}:
            recurrent_layer = {
                "LSTM": tf.keras.layers.LSTM,
                "GRU": tf.keras.layers.GRU,
                "SimpleRNN": tf.keras.layers.SimpleRNN,
            }[layer_type]
            layers.append(
                recurrent_layer(
                    units=int(spec["neurons"]),
                    activation=activation,
                    return_sequences=bool(spec.get("returnSequences", False)),
                )
            )
        elif layer_type in {"Dense", "Output"}:
            layers.append(
                tf.keras.layers.Dense(units=int(spec["neurons"]), activation=activation)
            )
        elif layer_type == "Dropout":
            layers.append(
                tf.keras.layers.Dropout(rate=float(spec.get("dropoutRate", 0.2)))
            )
        else:
            raise ValueError(f"Tipo de capa no compatible con Keras: {layer_type}.")

    model_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", architecture["name"]).strip("_")
    if not model_name or not model_name[0].isalnum():
        model_name = f"model_{model_name}"
    model = tf.keras.Sequential(layers, name=model_name[:120])
    optimizer_name = configuration["optimizer"]
    optimizer_factory = {
        "adam": tf.keras.optimizers.Adam,
        "sgd": tf.keras.optimizers.SGD,
        "rmsprop": tf.keras.optimizers.RMSprop,
    }.get(optimizer_name)
    if optimizer_factory is None:
        raise ValueError("Optimizador no permitido.")
    optimizer = optimizer_factory(learning_rate=float(configuration["learningRate"]))
    model.compile(
        optimizer=optimizer,
        loss=configuration["loss"],
        metrics=["accuracy"],
    )
    return model
