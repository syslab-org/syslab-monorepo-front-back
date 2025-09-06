# tools/docker/backend.Dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Dependencias del sistema (+ unzip para Terraform + psql para dbshell)
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  curl \
  unzip \
  ca-certificates \
  postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# ---------- Instalar Terraform ----------
ENV TF_VERSION=1.9.5
RUN curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip" -o /tmp/terraform.zip \
  && unzip /tmp/terraform.zip -d /usr/local/bin \
  && rm /tmp/terraform.zip \
  && terraform -version

# deps python
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

# código
COPY apps/backend/ .

# usuario no root
RUN useradd -m -u 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

CMD python manage.py migrate && \
  gunicorn teg.wsgi:application --bind 0.0.0.0:8000 --workers=2
