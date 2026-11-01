"""Persist training failures and Keras artifact locations."""

import sqlalchemy as sa
from alembic import op

revision = "0004_training_artifacts"
down_revision = "0003_cnn_rnn_configuration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    job_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("training_jobs")
    }
    if "error_message" not in job_columns:
        op.add_column(
            "training_jobs",
            sa.Column("error_message", sa.Text(), nullable=True),
        )

    model_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("model_versions")
    }
    if "artifact_path" not in model_columns:
        op.add_column(
            "model_versions",
            sa.Column("artifact_path", sa.String(length=512), nullable=True),
        )


def downgrade() -> None:
    job_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("training_jobs")
    }
    if "error_message" in job_columns:
        op.drop_column("training_jobs", "error_message")
    model_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("model_versions")
    }
    if "artifact_path" in model_columns:
        op.drop_column("model_versions", "artifact_path")
