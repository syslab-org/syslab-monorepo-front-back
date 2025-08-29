# guarda como: test_celery.sh
#!/usr/bin/env bash
set -euo pipefail

# ===== Config =====
# Puedes exportar ALB_URL antes de ejecutar, o dejar este por defecto.
ALB_URL="${ALB_URL:-http://tesis-dev-alb-462054227.us-east-1.elb.amazonaws.com}"
N="${1:-7}"              # segundos que dormirá la tarea (primer argumento opcional)
INTERVAL=2               # segundos entre consultas
MAX_TRIES=60             # 60 * 2s = 120s de espera máxima

echo "→ Encolando tarea (n=$N) en $ALB_URL ..."
POST_JSON=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"n\": $N}" "$ALB_URL/api/tasks/run/") || {
  echo "Error al encolar la tarea"; exit 1; }

# Extraer task_id (usa jq si está, si no, usa Python)
if command -v jq >/dev/null 2>&1; then
  TASK_ID=$(echo "$POST_JSON" | jq -r '.task_id')
else
  TASK_ID=$(python3 - <<'PY'
import sys, json
print(json.load(sys.stdin)["task_id"])
PY
  <<<"$POST_JSON")
fi

if [[ -z "${TASK_ID:-}" || "$TASK_ID" == "null" ]]; then
  echo "No pude obtener task_id. Respuesta: $POST_JSON"
  exit 1
fi

echo "✓ Tarea encolada. task_id=$TASK_ID"
echo "→ Consultando estado cada ${INTERVAL}s (máx ${MAX_TRIES} intentos)..."

i=0
while (( i < MAX_TRIES )); do
  RESP=$(curl -s "$ALB_URL/api/tasks/status/$TASK_ID/")
  # Parseo de state y (opcional) result
  if command -v jq >/dev/null 2>&1; then
    STATE=$(echo "$RESP" | jq -r '.state')
  else
    STATE=$(python3 - <<'PY'
import sys, json
print(json.load(sys.stdin)["state"])
PY
    <<<"$RESP")
  fi

  echo "   [$(printf '%02d' "$i")] state=$STATE"

  if [[ "$STATE" == "SUCCESS" ]]; then
    echo "✓ Terminó con éxito:"
    if command -v jq >/dev/null 2>&1; then
      echo "$RESP" | jq .
    else
      echo "$RESP"
    fi
    exit 0
  elif [[ "$STATE" == "FAILURE" ]]; then
    echo "✗ Falló:"
    if command -v jq >/dev/null 2>&1; then
      echo "$RESP" | jq .
    else
      echo "$RESP"
    fi
    exit 2
  fi

  sleep "$INTERVAL"
  ((i++))
done

echo "⚠️ Timeout esperando la tarea. Última respuesta:"
if command -v jq >/dev/null 2>&1; then
  echo "$RESP" | jq .
else
  echo "$RESP"
fi
exit 3
