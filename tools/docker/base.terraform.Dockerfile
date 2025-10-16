# tools/docker/base.terraform.Dockerfile
FROM python:3.11-slim AS base-tf

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  TF_INPUT=0 \
  TF_IN_AUTOMATION=1

WORKDIR /app

# Paquetes necesarios
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  unzip \
  ca-certificates \
  postgresql-client \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# --- Instalar Terraform con verificación de integridad y autodetección de arquitectura ---
ARG TF_VERSION=1.9.5

# Detecta arquitectura del contenedor y mapea a nombre de artefacto de HashiCorp
# amd64  -> linux_amd64
# arm64  -> linux_arm64
RUN set -eux; \
  arch="$(dpkg --print-architecture)"; \
  case "$arch" in \
  amd64) tf_arch="linux_amd64" ;; \
  arm64) tf_arch="linux_arm64" ;; \
  *) echo "Arquitectura no soportada: $arch" >&2; exit 1 ;; \
  esac; \
  cd /tmp; \
  tf_zip="terraform_${TF_VERSION}_${tf_arch}.zip"; \
  tf_sums="terraform_${TF_VERSION}_SHA256SUMS"; \
  curl -fsSLO "https://releases.hashicorp.com/terraform/${TF_VERSION}/${tf_zip}"; \
  curl -fsSLO "https://releases.hashicorp.com/terraform/${TF_VERSION}/${tf_sums}"; \
  # Verifica SHA256 usando el archivo oficial de checksums
  grep "  ${tf_zip}$" "${tf_sums}" | sha256sum -c -; \
  unzip "${tf_zip}" -d /usr/local/bin; \
  rm -f "${tf_zip}" "${tf_sums}"; \
  terraform -version
