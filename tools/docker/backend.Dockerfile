FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Paquetes de sistema necesarios para compilar deps y utilidades de red
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential curl netcat-traditional && \
  rm -rf /var/lib/apt/lists/*

# 1) cache de dependencias Python
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

# 2) copia del código
COPY apps/backend/ .

# 3) crea usuario no-root y cambia permisos
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Nota: mejor orquestar readiness con healthchecks/depends_on en Compose;
# pero si quieres mantener una espera "suave", este loop sirve en dev
CMD bash -lc "\
  until nc -z redis 6379; do echo '⏳ esperando redis...'; sleep 1; done; \
  python manage.py migrate && \
  gunicorn teg.wsgi:application --bind 0.0.0.0:8000 --workers=2"
