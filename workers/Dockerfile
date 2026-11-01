
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml .
COPY training ./training
RUN pip install --no-cache-dir .

CMD ["python", "-m", "training.main"]
