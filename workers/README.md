
# NeuroLab TensorFlow/Keras training worker

The worker claims queued CNN/RNN training jobs from the authenticated API,
loads numeric CSV datasets from the shared dataset volume, builds and trains a
`tf.keras` model, publishes per-epoch metrics, and saves a checksummed `.keras`
artifact. TensorFlow stays isolated from the FastAPI process.

## Local setup

Use Python 3.12 for the CPU worker (TensorFlow wheels are platform-specific):

```powershell
cd workers
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[test]"
$env:NEUROLAB_API_URL = "http://localhost:8000/api/v1"
$env:WORKER_API_KEY = "<same value as apps/api/.env>"
$env:DATASET_STORAGE_DIR = "..\apps\api\data\datasets"
$env:MODEL_STORAGE_DIR = ".\artifacts"
python -m training.main
```

When datasets are stored locally, the worker must be able to read the same
persistent directory used by the API. For Hugging Face datasets, the API
downloads each private file and streams it to the worker over the authenticated
worker endpoint; the Hugging Face token stays in the API environment.
`MODEL_STORAGE_DIR` must also be persistent and shared with any authorized
model-download service.

Datasets must be numeric CSV files with a target column and the declared input
features. For CNN, `inputShape` is `(height, width, channels)`; for RNN it is
`(timesteps, features)`. The number of selected CSV features must equal the
product of that shape. Categorical targets are label-encoded for supported
classification losses. Unsupported data formats and invalid shapes fail the
job with a user-visible error rather than simulating a successful run.

## Container

Build from the `workers` directory and mount the API dataset volume at
`/data/datasets` when using local storage; configure `NEUROLAB_API_URL`,
`WORKER_API_KEY`, `DATASET_STORAGE_DIR=/data/datasets`, and
`MODEL_STORAGE_DIR=/data/models`.
The image uses TensorFlow CPU; configure external orchestration and resource
limits before production use.
