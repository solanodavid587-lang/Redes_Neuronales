"""Expand CNN and RNN project, dataset, and architecture metadata."""

import sqlalchemy as sa
from alembic import op

revision = "0003_cnn_rnn_configuration"
down_revision = "0002_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {
        table: {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}
        for table in ("projects", "datasets", "architectures")
    }
    new_columns = (
        ("projects", sa.Column("objective", sa.Text(), nullable=False, server_default="")),
        (
            "projects",
            sa.Column(
                "model_family",
                sa.String(length=10),
                nullable=False,
                server_default="CNN",
            ),
        ),
        ("datasets", sa.Column("description", sa.Text(), nullable=False, server_default="")),
        ("datasets", sa.Column("target_column", sa.String(length=255), nullable=True)),
        (
            "datasets",
            sa.Column(
                "feature_columns",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[]'"),
            ),
        ),
        ("datasets", sa.Column("sequence_length", sa.Integer(), nullable=True)),
        ("architectures", sa.Column("description", sa.Text(), nullable=False, server_default="")),
        (
            "architectures",
            sa.Column(
                "input_shape",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[]'"),
            ),
        ),
    )
    for table, column in new_columns:
        if column.name not in columns[table]:
            op.add_column(table, column)


def downgrade() -> None:
    columns = {
        table: {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}
        for table in ("projects", "datasets", "architectures")
    }
    for table, name in (
        ("architectures", "input_shape"),
        ("architectures", "description"),
        ("datasets", "sequence_length"),
        ("datasets", "feature_columns"),
        ("datasets", "target_column"),
        ("datasets", "description"),
        ("projects", "model_family"),
        ("projects", "objective"),
    ):
        if name in columns[table]:
            op.drop_column(table, name)
