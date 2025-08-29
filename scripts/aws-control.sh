#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------------
# aws-control.sh — Control simple de la infraestructura AWS con Terraform
# Acciones:
#   start  -> Sube backend (1) y deja celery (0). Mantiene S3/Dynamo.
#   stop   -> Baja backend (0) y celery (0). Mantiene S3/Dynamo.
#   down   -> Destruye TODO lo desplegable (ECS/ALB/Redis/etc). Deja S3+Dynamo solo si NO están en este stack.
#   status -> Lista recursos en el estado de Terraform.
#
# Uso:
#   scripts/aws-control.sh start
#   scripts/aws-control.sh stop
#   scripts/aws-control.sh down
#   scripts/aws-control.sh status
#
# Variables opcionales:
#   AWS_PROFILE  (default: tesis)
#   TF_DIR       (default: infra/terraform)
#   REGION       (solo informativa para logs)
# -----------------------------------------------------------------------------------

ACTION="${1:-}"
AWS_PROFILE="${AWS_PROFILE:-tesis}"
TF_DIR="${TF_DIR:-infra/terraform}"
REGION="${REGION:-us-east-1}"

bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
info()   { printf "ℹ️  %s\n" "$*"; }
ok()     { printf "✅ %s\n" "$*"; }
warn()   { printf "⚠️  %s\n" "$*"; }
error()  { printf "❌ %s\n" "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { error "No se encontró '$1' en PATH"; exit 1; }
}

usage() {
  cat <<EOF
Uso: $(basename "$0") <start|stop|down|status>

Acciones:
  start   Sube backend (1 réplica), celery (0)
  stop    Baja backend y celery a 0
  down    Destruye todos los recursos administrados por este stack
  status  Muestra recursos actuales en el estado de Terraform

Variables opcionales:
  AWS_PROFILE (default: ${AWS_PROFILE})
  TF_DIR      (default: ${TF_DIR})
  REGION      (default: ${REGION})

Ejemplos:
  AWS_PROFILE=tesis $(basename "$0") start
  TF_DIR=infra/terraform $(basename "$0") status
EOF
}

confirm() {
  local prompt="${1:-¿Continuar?} [y/N]: "
  read -r -p "$prompt" resp
  case "$resp" in
    y|Y|yes|YES) return 0 ;;
    *)           return 1 ;;
  esac
}

main() {
  [[ -z "$ACTION" ]] && { usage; exit 1; }

  need terraform
  need awk

  # Chequeo rápido de AWS credenciales (solo mensaje informativo)
  if ! aws sts get-caller-identity --profile "$AWS_PROFILE" >/dev/null 2>&1; then
    warn "No pude verificar credenciales con AWS_PROFILE='${AWS_PROFILE}'. Si falla terraform, revisa 'aws configure --profile ${AWS_PROFILE}'."
  fi

  [[ -d "$TF_DIR" ]] || { error "No existe el directorio Terraform: $TF_DIR"; exit 1; }

  pushd "$TF_DIR" >/dev/null

  # Asegurar init del backend/providers
  info "Inicializando Terraform (backend/providers) con perfil ${AWS_PROFILE}..."
  terraform init -reconfigure >/dev/null

  case "$ACTION" in
    start)
      bold "🚀 Levantando backend en AWS (1) y dejando celery (0)…"
      terraform apply -auto-approve \
        -var="backend_desired_count=1" \
        -var="celery_desired_count=0"
      ok "Infra lista. Revisa el output 'backend_url' para probar."
      ;;

    stop)
      bold "⏸️  Deteniendo servicios (backend=0, celery=0)…"
      terraform apply -auto-approve \
        -var="backend_desired_count=0" \
        -var="celery_desired_count=0"
      ok "Servicios detenidos. S3+Dynamo siguen disponibles."
      ;;

    down)
      bold "🧨 Destruir TODO el stack administrado por este directorio Terraform"
      warn "Esto borrará ECS/Services/ALB/SG/Subnets/Redis (si están en este stack)."
      warn "El estado remoto (S3/Dynamo) no se borra con este comando."
      if confirm "¿Seguro que quieres continuar con 'terraform destroy'?"; then
        terraform destroy -auto-approve
        ok "Stack destruido. Costos al mínimo."
      else
        info "Operación cancelada."
      fi
      ;;

    status)
      bold "📋 Estado actual de recursos (terraform state list):"
      if ! terraform state list 2>/dev/null | awk 'NF'; then
        warn "No hay recursos en estado o el estado está vacío."
      fi
      ;;

    *)
      usage
      exit 1
      ;;
  esac

  # Mostrar outputs útiles si existen
  if terraform output >/dev/null 2>&1; then
    echo
    bold "🔎 Outputs:"
    terraform output || true
  fi

  popd >/dev/null
}

main "$@"
