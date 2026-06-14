# tools/docker/backend.Dockerfile
FROM base-tf AS runtime

WORKDIR /app

# Instalar deps Python (primero requirements para cache efectivo)
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY apps/backend/ .

# Usuario no root
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Nota: mantener migrate aquí es válido para dev; en prod suele correrse desde el pipeline.
CMD python manage.py migrate && \
  python manage.py collectstatic --noinput && \
  gunicorn teg.wsgi:application --bind 0.0.0.0:8000 --workers=2
