# tools/docker/backend.Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential curl && \
  rm -rf /var/lib/apt/lists/*

# deps python
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

# código
COPY apps/backend/ .

# usuario no root
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Arranque sin esperar Redis (válido para dev y AWS)
CMD python manage.py migrate && \
  gunicorn teg.wsgi:application --bind 0.0.0.0:8000 --workers=2
