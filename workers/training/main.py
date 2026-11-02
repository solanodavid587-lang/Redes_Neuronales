
import logging
import os
import sys
import time

from training.api_client import ApiClient, ApiClientError
from training.config import WorkerSettings
from training.job_runner import TrainingJobRunner


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger(__name__)
    settings = WorkerSettings.from_env()
    client = ApiClient(settings)
    runner = TrainingJobRunner(client, settings)
    logger.info("Worker TensorFlow/Keras iniciado; API: %s", settings.api_url)

    job_id = os.environ.get("TRAINING_JOB_ID", "").strip()
    if job_id:
        try:
            job = client.claim(job_id)
        except ApiClientError:
            logger.exception("No se pudo reclamar el trabajo %s.", job_id)
            return 1
        if job is None:
            logger.info("El trabajo %s ya no está en cola; no se ejecuta.", job_id)
            return 0
        logger.info("Trabajo %s reclamado para ejecución única.", job_id)
        return 0 if runner.run(job) else 1

    while True:
        try:
            job = client.claim()
            if job is not None:
                logger.info("Trabajo %s reclamado.", job.get("id", "(sin id)"))
                runner.run(job)
                continue
        except ApiClientError:
            logger.exception("No se pudo consultar la cola de entrenamiento.")
        time.sleep(settings.poll_interval_seconds)


if __name__ == "__main__":
    sys.exit(main())
