# tools/docker/celery.Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# paquetes base mínimos
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential curl && \
  rm -rf /var/lib/apt/lists/*

# deps python
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

# código (reutilizamos el mismo repo que el backend)
COPY apps/backend/ .

# usuario no root
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

# Arranque del worker de Celery
CMD celery -A teg worker -E --loglevel=INFO --pool=solo --concurrency=2
