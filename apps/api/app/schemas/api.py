from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ApiSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class ProjectCreate(ApiSchema):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=4000)
    objective: str = Field(min_length=1, max_length=4000)
    model_family: Literal["CNN", "RNN"] = "CNN"
    dataset_id: str = Field(min_length=1)


class ProjectUpdate(ApiSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    objective: str | None = Field(default=None, min_length=1, max_length=4000)
    model_family: Literal["CNN", "RNN"] | None = None
    status: Literal["ACTIVE", "DRAFT", "ARCHIVED"] | None = None


class LayerConfig(ApiSchema):
    id: str = Field(min_length=1, max_length=80)
    type: Literal[
        "Input",
        "Conv2D",
        "MaxPooling2D",
        "Flatten",
        "LSTM",
        "GRU",
        "SimpleRNN",
        "Dense",
        "Dropout",
        "Output",
    ]
    neurons: int = Field(ge=1, le=1000000)
    activation: str = Field(min_length=1, max_length=40)
    kernel_size: int = Field(default=3, ge=1, le=15)
    dropout_rate: float = Field(default=0.2, ge=0, lt=1)
    return_sequences: bool = False


class DatasetCreate(ApiSchema):
    project_id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=4000)
    format: Literal["CSV", "JSON", "IMAGES", "TEXT"]
    size_bytes: int = Field(default=0, ge=0)
    rows: int = Field(default=0, ge=0)
    train_split: float = Field(default=0.8, ge=0, le=1)
    val_split: float = Field(default=0.2, ge=0, le=1)
    target_column: str | None = Field(default=None, max_length=255)
    feature_columns: list[str] = Field(default_factory=list, max_length=500)
    sequence_length: int | None = Field(default=None, ge=1, le=1000000)
    storage_path: str | None = Field(default=None, max_length=512)

    @model_validator(mode="after")
    def validate_splits(self) -> "DatasetCreate":
        if self.train_split + self.val_split > 1:
            raise ValueError("La suma de trainSplit y valSplit no puede superar 1.")
        if self.target_column and self.target_column in self.feature_columns:
            raise ValueError("La columna objetivo no puede estar entre las características.")
        if any(not column.strip() for column in self.feature_columns):
            raise ValueError("Los nombres de las características no pueden estar vacíos.")
        return self


class DatasetUpdate(ApiSchema):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    train_split: float | None = Field(default=None, ge=0, le=1)
    val_split: float | None = Field(default=None, ge=0, le=1)
    target_column: str | None = Field(default=None, max_length=255)
    feature_columns: list[str] | None = Field(default=None, max_length=500)
    sequence_length: int | None = Field(default=None, ge=1, le=1000000)

    @model_validator(mode="after")
    def validate_splits(self) -> "DatasetUpdate":
        if (
            self.train_split is not None
            and self.val_split is not None
            and self.train_split + self.val_split > 1
        ):
            raise ValueError("La suma de trainSplit y valSplit no puede superar 1.")
        if (
            self.target_column
            and self.feature_columns is not None
            and self.target_column in self.feature_columns
        ):
            raise ValueError("La columna objetivo no puede estar entre las características.")
        return self


class ArchitectureCreate(ApiSchema):
    project_id: str
    name: str = Field(min_length=1, max_length=120)
    family: Literal["RNN", "CNN"]
    description: str = Field(default="", max_length=4000)
    input_shape: list[Annotated[int, Field(ge=1, le=1000000)]] = Field(
        min_length=1, max_length=4
    )
    layers: list[LayerConfig] = Field(min_length=2, max_length=100)


class ArchitectureUpdate(ApiSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    family: Literal["RNN", "CNN"] | None = None
    description: str | None = Field(default=None, max_length=4000)
    input_shape: list[Annotated[int, Field(ge=1, le=1000000)]] | None = Field(
        default=None, min_length=1, max_length=4
    )
    layers: list[LayerConfig] | None = Field(default=None, min_length=2, max_length=100)


class TrainingConfiguration(ApiSchema):
    batch_size: int = Field(default=32, ge=1, le=65536)
    learning_rate: float = Field(default=0.001, gt=0, le=1)
    optimizer: Literal["adam", "sgd", "rmsprop"] = "adam"
    loss: Literal[
        "binary_crossentropy",
        "categorical_crossentropy",
        "sparse_categorical_crossentropy",
        "mean_squared_error",
        "mean_absolute_error",
    ] = "sparse_categorical_crossentropy"
    early_stopping: bool = True
    patience: int = Field(default=5, ge=0, le=1000)
    seed: int = Field(default=42, ge=0, le=2147483647)


class TrainingCreate(ApiSchema):
    project_id: str
    dataset_id: str
    architecture_id: str
    total_epochs: int = Field(default=10, ge=1, le=10000)
    configuration: TrainingConfiguration = Field(default_factory=TrainingConfiguration)


class ModelVersionCreate(ApiSchema):
    project_id: str
    architecture_id: str
    name: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=40)
    accuracy: float | None = Field(default=None, ge=0, le=1)
    size_bytes: int = Field(default=0, ge=0)
    format: Literal["KERAS", "SavedModel", "H5", "ONNX"]
    checksum: str = Field(default="", max_length=128)


class ModelVersionUpdate(ApiSchema):
    status: Literal["DRAFT", "REVIEW", "APPROVED", "RETIRED"]


class ReportCreate(ApiSchema):
    project_id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    format: Literal["PDF", "CSV"]


class MetricCreate(ApiSchema):
    epoch: int = Field(ge=1)
    train_loss: float = Field(ge=0)
    val_loss: float = Field(ge=0)
    train_accuracy: float = Field(ge=0, le=1)
    val_accuracy: float = Field(ge=0, le=1)


class TrainingComplete(ApiSchema):
    artifact_path: str = Field(min_length=1, max_length=512)
    checksum: str = Field(min_length=64, max_length=64)
    size_bytes: int = Field(ge=1)
    val_accuracy: float = Field(ge=0, le=1)
    precision: float | None = Field(default=None, ge=0, le=1)
    recall: float | None = Field(default=None, ge=0, le=1)
    f1_score: float | None = Field(default=None, ge=0, le=1)
    confusion_matrix: list[list[int]] | None = None

    @model_validator(mode="after")
    def validate_confusion_matrix(self) -> "TrainingComplete":
        if self.confusion_matrix is not None:
            size = len(self.confusion_matrix)
            if not size or any(len(row) != size for row in self.confusion_matrix):
                raise ValueError("La matriz de confusión debe ser cuadrada y no vacía.")
            if any(value < 0 for row in self.confusion_matrix for value in row):
                raise ValueError("La matriz de confusión no puede contener valores negativos.")
        return self


class TrainingFailure(ApiSchema):
    error: str = Field(min_length=1, max_length=2000)
