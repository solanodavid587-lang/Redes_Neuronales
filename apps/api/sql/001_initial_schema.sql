-- Initial PostgreSQL schema for NeuroLab.
-- Alembic is the canonical migration runner; see app/db/migrations/versions.

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS datasets (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(20) NOT NULL,
    size_bytes BIGINT NOT NULL,
    rows_count INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    train_split DOUBLE PRECISION NOT NULL,
    val_split DOUBLE PRECISION NOT NULL,
    storage_path VARCHAR(512),
    uploaded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS architectures (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    family VARCHAR(40) NOT NULL,
    layers JSON NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS training_jobs (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
    dataset_id VARCHAR(36) NOT NULL REFERENCES datasets(id),
    architecture_id VARCHAR(36) NOT NULL REFERENCES architectures(id),
    status VARCHAR(20) NOT NULL,
    progress INTEGER NOT NULL,
    epoch INTEGER NOT NULL,
    total_epochs INTEGER NOT NULL,
    loss DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    configuration JSON NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS training_metrics (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    job_id VARCHAR(36) NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
    epoch INTEGER NOT NULL,
    train_loss DOUBLE PRECISION NOT NULL,
    val_loss DOUBLE PRECISION NOT NULL,
    train_accuracy DOUBLE PRECISION NOT NULL,
    val_accuracy DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS model_versions (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
    architecture_id VARCHAR(36) NOT NULL REFERENCES architectures(id),
    name VARCHAR(120) NOT NULL,
    version VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL,
    accuracy DOUBLE PRECISION,
    size_bytes BIGINT NOT NULL,
    format VARCHAR(20) NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL,
    size_bytes INTEGER NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(128) NOT NULL,
    action VARCHAR(80) NOT NULL,
    target VARCHAR(255) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS ix_datasets_owner_id ON datasets(owner_id);
CREATE INDEX IF NOT EXISTS ix_datasets_project_id ON datasets(project_id);
CREATE INDEX IF NOT EXISTS ix_architectures_owner_id ON architectures(owner_id);
CREATE INDEX IF NOT EXISTS ix_architectures_project_id ON architectures(project_id);
CREATE INDEX IF NOT EXISTS ix_training_jobs_owner_id ON training_jobs(owner_id);
CREATE INDEX IF NOT EXISTS ix_training_jobs_project_id ON training_jobs(project_id);
CREATE INDEX IF NOT EXISTS ix_training_jobs_dataset_id ON training_jobs(dataset_id);
CREATE INDEX IF NOT EXISTS ix_training_jobs_architecture_id ON training_jobs(architecture_id);
CREATE INDEX IF NOT EXISTS ix_training_metrics_owner_id ON training_metrics(owner_id);
CREATE INDEX IF NOT EXISTS ix_training_metrics_job_id ON training_metrics(job_id);
CREATE INDEX IF NOT EXISTS ix_model_versions_owner_id ON model_versions(owner_id);
CREATE INDEX IF NOT EXISTS ix_model_versions_project_id ON model_versions(project_id);
CREATE INDEX IF NOT EXISTS ix_model_versions_architecture_id ON model_versions(architecture_id);
CREATE INDEX IF NOT EXISTS ix_reports_owner_id ON reports(owner_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_owner_id ON audit_logs(owner_id);
