# tools/docker/base.terraform.Dockerfile
FROM python:3.11-slim AS base-tf

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  TF_INPUT=0 \
  TF_IN_AUTOMATION=1 \
  TF_CLI_CONFIG_FILE=/etc/terraform.d/terraform.rc

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
ARG AWS_PROVIDER_VERSION=5.100.0

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

# --- Vendor del provider AWS para evitar depender del registry en runtime ---
RUN set -eux; \
  arch="$(dpkg --print-architecture)"; \
  case "$arch" in \
  amd64) tf_arch="linux_amd64" ;; \
  arm64) tf_arch="linux_arm64" ;; \
  *) echo "Arquitectura no soportada: $arch" >&2; exit 1 ;; \
  esac; \
  provider_root="/opt/terraform/providers/registry.terraform.io/hashicorp/aws/${AWS_PROVIDER_VERSION}/${tf_arch}"; \
  mkdir -p "${provider_root}" /etc/terraform.d; \
  cd /tmp; \
  provider_zip="terraform-provider-aws_${AWS_PROVIDER_VERSION}_${tf_arch}.zip"; \
  provider_sums="terraform-provider-aws_${AWS_PROVIDER_VERSION}_SHA256SUMS"; \
  curl -fsSLO "https://releases.hashicorp.com/terraform-provider-aws/${AWS_PROVIDER_VERSION}/${provider_zip}"; \
  curl -fsSLO "https://releases.hashicorp.com/terraform-provider-aws/${AWS_PROVIDER_VERSION}/${provider_sums}"; \
  grep "  ${provider_zip}$" "${provider_sums}" | sha256sum -c -; \
  unzip -o "${provider_zip}" -d "${provider_root}"; \
  rm -f "${provider_zip}" "${provider_sums}"; \
  cat > /etc/terraform.d/terraform.rc <<EOF
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/hashicorp/aws"]
  }
  direct {
    exclude = ["registry.terraform.io/hashicorp/aws"]
  }
}
EOF
