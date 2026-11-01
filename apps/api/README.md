# NeuroLab API

FastAPI backend for the NeuroLab dashboard. PostgreSQL is the source of truth.
The API authenticates local user accounts and issues access tokens for private
`/api/v1` routes. Supabase is used for PostgreSQL and optional Storage.

## Local setup with Supabase Session Pooler

1. Copy `.env.example` to `.env`.
2. In Supabase, open **Connect → Session pooler** and copy the host, port,
   database, username, and password into `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
   `DB_USERNAME`, and `DB_PASSWORD`. The application enables
   `sslmode=require` and safely handles special characters in the password.
   `DATABASE_URL` remains supported as a backwards-compatible fallback.
3. Generate a long random `AUTH_TOKEN_SECRET` for signing API access tokens.
   `SUPABASE_URL` identifies the project and is required to form the JWT issuer;
   Supabase Auth is not used for local login.
4. Install dependencies and initialize the schema with Alembic:

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

The API reads `apps/api/.env` regardless of the current working directory.
`GET /health` checks that the process is up; `GET /api/v1/health/ready` also
checks the PostgreSQL connection. OpenAPI is available at `/docs`.

The committed `.env.example` contains placeholders only. The local `.env` is
git-ignored. Database credentials are required for the pooler; local login does
not require Supabase Auth keys.

## Local user authentication

The `users` table stores email, role, activation status, and a PBKDF2-SHA256
password hash; plaintext passwords are never stored. There is no public signup
route. Create the initial admin from `apps/api` after configuring
`AUTH_TOKEN_SECRET` and applying migrations:

```powershell
python scripts/create_local_admin.py
```

The script prompts for the email and password without echoing the password.
Access tokens expire after 12 hours. Existing Supabase Auth users are not
automatically imported.

## Routes

All routes below `/api/v1` except health checks and `POST /auth/login` require a
NeuroLab access token in the `Authorization: Bearer ...` header. Resource data
is scoped to the token's `sub` claim.

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, admin-only `GET/POST /auth/users`, `PATCH /auth/users/{id}` |
| Dashboard | `GET /dashboard/summary` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}`, admin-only `DELETE /projects/{id}/permanent` |
| Datasets | `GET/POST /datasets`, `POST /datasets/upload`, `PATCH/DELETE /datasets/{id}` |
| Architectures | `GET/POST /architectures`, `PATCH/DELETE /architectures/{id}`, `POST /architectures/{id}/validate` |
| Training | `GET/POST /training-jobs`, `DELETE /training-jobs/{id}`, `GET /training-jobs/{id}/metrics` |
| Training worker | `POST /training-jobs/worker/claim`, `GET /datasets/worker/{id}/download`, `POST /training-jobs/{id}/metrics`, `POST /training-jobs/{id}/complete`, `POST /training-jobs/{id}/fail` |
| Model registry | `GET/POST /model-versions`, `PATCH/DELETE /model-versions/{id}` |
| Reports | `GET/POST /reports`, `DELETE /reports/{id}` |
| Audit | `GET /audit` |

List routes return `{items, total, limit, offset}`. `limit` is capped at 100.
`DELETE /projects/{id}` archives the project rather than destroying its records.
Admins can permanently delete a project with
`DELETE /projects/{id}/permanent` after its training jobs and model versions are
removed. Associated datasets and architectures are kept and detached from the
project. Admins can also delete completed training jobs; running jobs cannot be
deleted.

Projects require an available, ready dataset (`datasetId`) at creation time and
select one model family (`modelFamily`: `CNN` or `RNN`). Their objective is
stored separately from the description. Dataset records include optional
target/features, sequence length, description, and train/validation splits.
Architectures must match the project's family and include its corresponding
convolutional or recurrent layer; they store input shape and per-layer settings.
Training configuration validates optimizer, loss, batch size, learning rate,
early stopping, patience, and random seed.

The initial dataset is associated with the project and cannot be removed while
it is the project's only dataset or is referenced by a training job. Projects
with saved architectures cannot change their model family.

## Role permissions

The API enforces these permissions on writes; hiding UI controls is not the
security boundary. `ADMIN` can perform all operations. `PROJECT_MANAGER` can
create, edit, and archive projects and manage datasets. `AI_ENGINEER` can manage
datasets, create/edit/delete architectures, queue training, and register model
versions. `REVIEWER` has read access and can approve models in review. All roles
can request reports; user administration and audit logs remain `ADMIN` only.

Training jobs are claimed by a separate TensorFlow/Keras worker; the API does
not train inside an HTTP request. Configure `WORKER_API_KEY` in the API and
worker environments with the same secret. Dataset uploads use Hugging Face when
both `HF_TOKEN` and `HF_DATASET_REPO_ID` are configured; otherwise they use the
configured S3-compatible bucket or local `DATASET_STORAGE_DIR`. The Hugging Face
repository must be a private dataset repository and the token needs read/write
access to it. The API proxies private dataset downloads to the worker using its
authenticated API key; the Hugging Face token is not needed in the worker or
browser. S3 remains available for model artifacts and as a dataset fallback.
Without remote storage, API and worker must share the same persistent dataset
directory. The worker trains CNN or RNN architectures, publishes per-epoch
metrics, and registers the resulting `.keras` artifact. Worker setup, runtime
requirements, and supported numeric CSV inputs are documented in
[`workers/README.md`](../../workers/README.md). Run database migrations before
using worker artifact fields.

`POST /datasets/upload` accepts CSV, JSON, ZIP, TXT, and supported image files
without an application-defined file-size limit, and stores them in the configured
Hugging Face dataset repository, S3 bucket, or
`DATASET_STORAGE_DIR` (default: `data/datasets`) after authenticating the
request. CSV preview, dataset deletion, and training-worker downloads use the
same provider as each upload. See [`DEPLOYMENT.md`](../../DEPLOYMENT.md) for
Vercel, Render, Hugging Face, and S3-compatible storage setup.
The selected provider, account quota, and hosting platform may impose their own
file-size or storage limits.

## Database SQL and migrations

`sql/001_initial_schema.sql` contains the PostgreSQL baseline schema for a fresh
database, including the tables and indexes used by the API. Alembic is the
canonical migration runner; apply it with `alembic upgrade head` from `apps/api`.
Do not apply the SQL file and Alembic baseline to the same database. For future
model changes, create a revision with:

```powershell
alembic revision --autogenerate -m "describe the schema change"
alembic upgrade head
```

Review autogenerated revisions before applying them.

User creation is restricted to active administrators; new passwords must be at
least 12 characters and are stored only as PBKDF2-SHA256 hashes.
