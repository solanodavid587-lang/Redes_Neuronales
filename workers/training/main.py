
import logging
import time

from training.api_client import ApiClient, ApiClientError
from training.config import WorkerSettings
from training.job_runner import TrainingJobRunner


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger(__name__)
    settings = WorkerSettings.from_env()
    client = ApiClient(settings)
    runner = TrainingJobRunner(client, settings)
    logger.info("Worker TensorFlow/Keras iniciado; API: %s", settings.api_url)

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
    main()
