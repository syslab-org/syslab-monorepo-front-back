# tools/docker/celery.Dockerfile
FROM base-tf AS runtime

WORKDIR /app

# Instalar deps Python
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

# Copiar el mismo código del backend (reutilizamos el proyecto)
COPY apps/backend/ .

# Usuario no root
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

# Arranque del worker Celery
# -E: enviar eventos (para Flower)
# --pool=solo: más estable en Fargate y entornos limitados
# --concurrency=2: ajusta según necesidad
CMD celery -A teg worker -E --loglevel=INFO --pool=solo --concurrency=2
