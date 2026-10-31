from typing import Any, Literal

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


class ProjectUpdate(ApiSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    status: Literal["ACTIVE", "DRAFT", "ARCHIVED"] | None = None


class LayerConfig(ApiSchema):
    id: str = Field(min_length=1, max_length=80)
    type: Literal["Input", "Dense", "Conv2D", "LSTM", "Dropout", "Output"]
    neurons: int = Field(ge=1, le=1000000)
    activation: str = Field(min_length=1, max_length=40)


class DatasetCreate(ApiSchema):
    project_id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    format: Literal["CSV", "JSON", "IMAGES", "TEXT"]
    size_bytes: int = Field(default=0, ge=0)
    rows: int = Field(default=0, ge=0)
    train_split: float = Field(default=0.8, ge=0, le=1)
    val_split: float = Field(default=0.2, ge=0, le=1)
    storage_path: str | None = Field(default=None, max_length=512)

    @model_validator(mode="after")
    def validate_splits(self) -> "DatasetCreate":
        if self.train_split + self.val_split > 1:
            raise ValueError("La suma de trainSplit y valSplit no puede superar 1.")
        return self


class ArchitectureCreate(ApiSchema):
    project_id: str | None = None
    name: str = Field(min_length=1, max_length=120)
    family: Literal["Feedforward", "RNN", "CNN", "GAN"]
    layers: list[LayerConfig] = Field(min_length=2, max_length=100)


class ArchitectureUpdate(ApiSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    family: Literal["Feedforward", "RNN", "CNN", "GAN"] | None = None
    layers: list[LayerConfig] | None = Field(default=None, min_length=2, max_length=100)


class TrainingCreate(ApiSchema):
    project_id: str
    dataset_id: str
    architecture_id: str
    total_epochs: int = Field(default=10, ge=1, le=10000)
    configuration: dict[str, Any] = Field(default_factory=dict)


class ModelVersionCreate(ApiSchema):
    project_id: str
    architecture_id: str
    name: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=40)
    accuracy: float | None = Field(default=None, ge=0, le=1)
    size_bytes: int = Field(default=0, ge=0)
    format: Literal["SavedModel", "H5", "ONNX"]
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
