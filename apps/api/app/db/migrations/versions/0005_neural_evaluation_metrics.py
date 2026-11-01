"""Persist neural-network evaluation metrics for training jobs."""

import sqlalchemy as sa
from alembic import op

revision = "0005_neural_evaluation_metrics"
down_revision = "0004_training_artifacts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("training_jobs")
    }
    new_columns = (
        sa.Column("precision", sa.Float(), nullable=True),
        sa.Column("recall", sa.Float(), nullable=True),
        sa.Column("f1_score", sa.Float(), nullable=True),
        sa.Column("confusion_matrix", sa.JSON(), nullable=True),
    )
    for column in new_columns:
        if column.name not in columns:
            op.add_column("training_jobs", column)


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("training_jobs")
    }
    for name in ("confusion_matrix", "f1_score", "recall", "precision"):
        if name in columns:
            op.drop_column("training_jobs", name)
