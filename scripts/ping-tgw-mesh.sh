#!/usr/bin/env bash
set -euo pipefail

KEY_PATH="${1:-$HOME/.ssh/tesis-key.pem}"
AWS_PROFILE="${AWS_PROFILE:-tesis}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SSH_USER="${SSH_USER:-ec2-user}"
OPEN_SSH="${OPEN_SSH:-0}" # OPEN_SSH=1 agrega/revoca regla temporal TCP/22 a tu IP pública

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta comando requerido: $1"
    exit 1
  }
}

need aws
need ssh
need curl
need jq

[[ -f "$KEY_PATH" ]] || {
  echo "No existe la llave: $KEY_PATH"
  exit 1
}
chmod 400 "$KEY_PATH" || true

A_PUB=""; A_PRIV=""; A_SG=""
B_PUB=""; B_PRIV=""; B_SG=""
C_PUB=""; C_PRIV=""; C_SG=""

while read -r NAME PUBLIC PRIVATE SGID; do
  [[ -n "${NAME:-}" ]] || continue
  case "$NAME" in
    bastion-a1) A_PUB="$PUBLIC"; A_PRIV="$PRIVATE"; A_SG="$SGID" ;;
    bastion-b1) B_PUB="$PUBLIC"; B_PRIV="$PRIVATE"; B_SG="$SGID" ;;
    bastion-c1) C_PUB="$PUBLIC"; C_PRIV="$PRIVATE"; C_SG="$SGID" ;;
  esac
done < <(
  aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --filters \
      "Name=instance-state-name,Values=running" \
      "Name=tag:Name,Values=bastion-a1,bastion-b1,bastion-c1" \
    --output json \
    | jq -r '
      .Reservations[].Instances[]
      | {
          name: ((.Tags // []) | map(select(.Key=="Name")) | .[0].Value // ""),
          public: (.PublicIpAddress // ""),
          private: (.PrivateIpAddress // ""),
          sg: ((.SecurityGroups // [])[0].GroupId // "")
        }
      | select(.name == "bastion-a1" or .name == "bastion-b1" or .name == "bastion-c1")
      | [.name, .public, .private, .sg] | @tsv
    '
)

pub_ip() {
  case "$1" in
    A) echo "$A_PUB" ;;
    B) echo "$B_PUB" ;;
    C) echo "$C_PUB" ;;
    *) echo "" ;;
  esac
}

priv_ip() {
  case "$1" in
    A) echo "$A_PRIV" ;;
    B) echo "$B_PRIV" ;;
    C) echo "$C_PRIV" ;;
    *) echo "" ;;
  esac
}

sg_id() {
  case "$1" in
    A) echo "$A_SG" ;;
    B) echo "$B_SG" ;;
    C) echo "$C_SG" ;;
    *) echo "" ;;
  esac
}

for letter in A B C; do
  [[ -n "$(pub_ip "$letter")" ]] || { echo "No encontré bastion-$letter (public IP)."; exit 1; }
  [[ -n "$(priv_ip "$letter")" ]] || { echo "No encontré bastion-$letter (private IP)."; exit 1; }
done

TEMP_CIDR=""
A_ADDED_RULE=0
B_ADDED_RULE=0
C_ADDED_RULE=0

set_added_rule_flag() {
  case "$1" in
    A) A_ADDED_RULE="$2" ;;
    B) B_ADDED_RULE="$2" ;;
    C) C_ADDED_RULE="$2" ;;
  esac
}

added_rule_flag() {
  case "$1" in
    A) echo "$A_ADDED_RULE" ;;
    B) echo "$B_ADDED_RULE" ;;
    C) echo "$C_ADDED_RULE" ;;
    *) echo "0" ;;
  esac
}

has_ssh_rule() {
  local sg="$1"
  local cidr="$2"
  local count
  count="$(
    aws ec2 describe-security-groups \
      --region "$AWS_REGION" \
      --profile "$AWS_PROFILE" \
      --group-ids "$sg" \
      --output json \
      | jq -r --arg cidr "$cidr" '
        [
          .SecurityGroups[0].IpPermissions[]?
          | select(.IpProtocol == "tcp" and .FromPort == 22 and .ToPort == 22)
          | .IpRanges[]?.CidrIp
          | select(. == $cidr)
        ] | length
      '
  )"
  [[ "${count:-0}" -gt 0 ]]
}

cleanup() {
  if [[ "$OPEN_SSH" != "1" || -z "$TEMP_CIDR" ]]; then
    return 0
  fi
  for letter in A B C; do
    [[ "$(added_rule_flag "$letter")" == "1" ]] || continue
    SGG="$(sg_id "$letter")"
    [[ -n "$SGG" ]] || continue
    aws ec2 revoke-security-group-ingress \
      --region "$AWS_REGION" \
      --profile "$AWS_PROFILE" \
      --group-id "$SGG" \
      --protocol tcp \
      --port 22 \
      --cidr "$TEMP_CIDR" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

if [[ "$OPEN_SSH" == "1" ]]; then
  MY_IP="$(curl -fsS https://checkip.amazonaws.com | tr -d '\n' || true)"
  [[ -n "$MY_IP" ]] || { echo "No pude obtener IP pública."; exit 1; }
  TEMP_CIDR="${MY_IP}/32"
  echo "Agregando regla temporal SSH (22) para $TEMP_CIDR ..."
  for letter in A B C; do
    SGG="$(sg_id "$letter")"
    [[ -n "$SGG" ]] || continue
    if has_ssh_rule "$SGG" "$TEMP_CIDR"; then
      continue
    fi
    aws ec2 authorize-security-group-ingress \
      --region "$AWS_REGION" \
      --profile "$AWS_PROFILE" \
      --group-id "$SGG" \
      --protocol tcp \
      --port 22 \
      --cidr "$TEMP_CIDR" >/dev/null 2>&1 || true
    if has_ssh_rule "$SGG" "$TEMP_CIDR"; then
      set_added_rule_flag "$letter" "1"
    fi
  done
fi

echo "Instancias detectadas:"
echo "A: pub=$(pub_ip A) priv=$(priv_ip A)"
echo "B: pub=$(pub_ip B) priv=$(priv_ip B)"
echo "C: pub=$(pub_ip C) priv=$(priv_ip C)"
echo

pairs=("A B" "A C" "B A" "B C" "C A" "C B")
for p in "${pairs[@]}"; do
  read -r FROM TO <<< "$p"
  FROM_PUB="$(pub_ip "$FROM")"
  TO_PRIV="$(priv_ip "$TO")"

  echo "=== Ping $FROM -> $TO ($TO_PRIV) ==="
  ssh -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=12 \
    "${SSH_USER}@${FROM_PUB}" \
    "ping -c 4 -W 2 ${TO_PRIV}"
  echo
done

echo "✅ Pruebas TGW completadas"
