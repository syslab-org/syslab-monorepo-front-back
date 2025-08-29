#!/usr/bin/env bash
set -euo pipefail

# Permite override: AWS_PROFILE=otro source scripts/set_backend_url.sh
: "${AWS_PROFILE:=tesis}"

cd "$(dirname "$0")/../infra/terraform"
URL=$(terraform output -raw backend_url 2>/dev/null || true)

if [ -z "$URL" ]; then
  echo "❌ No pude leer 'backend_url' del state de Terraform."
  echo "   Verifica que el state esté inicializado y tenga outputs:"
  echo "   cd infra/terraform && terraform output"
  return 1 2>/dev/null || exit 1
fi

export BACKEND_URL="$URL"
echo "✅ BACKEND_URL=$BACKEND_URL"
