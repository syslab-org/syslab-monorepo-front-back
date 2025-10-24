#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./destroy_vpcs.sh --prefix VPC-             # destruye todas las VPC con tag Name que empieza por "VPC-"
#   ./destroy_vpcs.sh --vpc-id vpc-0123456789   # destruye una VPC específica
#   ./destroy_vpcs.sh --prefix lab- --region us-east-1 --dry-run
#
# Requisitos: AWS CLI v2 y credenciales válidas para la región objetivo.

REGION="${REGION:-us-east-1}"
DRY_RUN=0
VPC_ID=""
PREFIX=""

log() { printf "%b\n" "$*"; }
ok()  { log "✅ $*"; }
warn(){ log "⚠️  $*"; }
err() { log "❌ $*" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --vpc-id) VPC_ID="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help)
      cat <<EOF
destroy_vpcs.sh --region <aws-region> [--vpc-id vpc-xxx | --prefix NAME-] [--dry-run]
EOF
      exit 0;;
    *) err "Arg desconocido: $1"; exit 1;;
  esac
done

if [[ -z "$VPC_ID" && -z "$PREFIX" ]]; then
  err "Debes pasar --vpc-id o --prefix"
  exit 1
fi

aws_ec2() { aws ec2 --region "$REGION" "$@"; }

# --- helpers ---------------------------------------------------------------

# Lista VPCs a limpiar
list_vpcs() {
  if [[ -n "$VPC_ID" ]]; then
    aws_ec2 describe-vpcs --vpc-ids "$VPC_ID" \
      --query 'Vpcs[].{VpcId:VpcId,Name:Tags[?Key==`Name`]|[0].Value}' --output json
  else
    # Trae todas y filtra por prefijo en bash (portable)
    aws_ec2 describe-vpcs \
      --query 'Vpcs[].{VpcId:VpcId,Name:Tags[?Key==`Name`]|[0].Value}' --output json | \
      jq --arg p "$PREFIX" '[ .[] | select(.Name|tostring|startswith($p)) ]'
  fi
}

delete_vpc() {
  local vpc_id="$1"
  local name="$2"

  log ""
  log "==============================="
  log " VPC: ${vpc_id} (${name:-sin-name})"
  log "==============================="

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] Solo listado / no se borra nada"
  fi

  # 1) Instancias EC2
  local inst_ids
  inst_ids=$(aws_ec2 describe-instances \
    --filters "Name=vpc-id,Values=$vpc_id" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text || true)
  if [[ -n "${inst_ids// /}" ]]; then
    if [[ "$DRY_RUN" -eq 0 ]]; then
      aws_ec2 terminate-instances --instance-ids $inst_ids >/dev/null || true
      aws_ec2 wait instance-terminated --instance-ids $inst_ids || true
    fi
    ok "Instancias EC2 eliminadas: ${inst_ids}"
  else
    ok "No hay instancias EC2"
  fi

  # 2) NAT Gateways (y esperar a deleted)
  local nat_ids
  nat_ids=$(aws_ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc_id" \
            --query 'NatGateways[].NatGatewayId' --output text || true)
  if [[ -n "${nat_ids// /}" ]]; then
    for nat in $nat_ids; do
      if [[ "$DRY_RUN" -eq 0 ]]; then
        aws_ec2 delete-nat-gateway --nat-gateway-id "$nat" >/dev/null || true
      fi
      ok "NAT eliminado: $nat (puede tardar ~1-2 min en borrarse)"
    done
    # Espera best-effort a que queden en deleted
    if [[ "$DRY_RUN" -eq 0 ]]; then
      for _ in {1..30}; do
        left=$(aws_ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc_id" \
                 --query 'NatGateways[?State!=`deleted`].NatGatewayId' --output text || true)
        [[ -z "${left// /}" ]] && break
        sleep 5
      done
    fi
  else
    ok "No hay NAT Gateways"
  fi

  # 3) Elastic IPs no asociadas (de esta VPC, best-effort)
  local eips
  eips=$(aws_ec2 describe-addresses --query 'Addresses[].AllocationId' --output text || true)
  if [[ -n "${eips// /}" ]]; then
    for eip in $eips; do
      if [[ "$DRY_RUN" -eq 0 ]]; then
        aws_ec2 release-address --allocation-id "$eip" >/dev/null || true
      fi
    done
    ok "Elastic IPs liberadas (best-effort)"
  fi

  # 4) Peering que referencien a la VPC
  local peers
  peers=$(aws_ec2 describe-vpc-peering-connections \
            --query "VpcPeeringConnections[?RequesterVpcInfo.VpcId=='$vpc_id' || AccepterVpcInfo.VpcId=='$vpc_id'].VpcPeeringConnectionId" \
            --output text || true)
  if [[ -n "${peers// /}" ]]; then
    for pcx in $peers; do
      [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$pcx" >/dev/null || true
      ok "Peering eliminado: $pcx"
    done
  fi

  # 5) TGW attachments (si hubiera)
  local tgw_att
  tgw_att=$(aws ec2 describe-transit-gateway-vpc-attachments --region "$REGION" \
              --query "TransitGatewayVpcAttachments[?VpcId=='$vpc_id'].TransitGatewayVpcAttachmentId" \
              --output text || true)
  if [[ -n "${tgw_att// /}" ]]; then
    for att in $tgw_att; do
      [[ "$DRY_RUN" -eq 0 ]] && aws ec2 delete-transit-gateway-vpc-attachment --region "$REGION" --transit-gateway-vpc-attachment-id "$att" >/dev/null || true
      ok "TGW attachment eliminado: $att"
    done
  fi

  # 6) Desasociar y borrar route tables NO main
  local rt_ids
  rt_ids=$(aws_ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" \
             --query "RouteTables[?Associations[?Main!=\`true\`]].RouteTableId" --output text || true)
  for rt in $rt_ids; do
    # desasociar
    local assoc_ids
    assoc_ids=$(aws_ec2 describe-route-tables --route-table-ids "$rt" \
                   --query 'RouteTables[].Associations[].RouteTableAssociationId' --output text || true)
    for a in $assoc_ids; do
      [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 disassociate-route-table --association-id "$a" >/dev/null || true
    done
    # borrar
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-route-table --route-table-id "$rt" >/dev/null || true
    ok "Route table eliminada: $rt"
  done

  # 7) Security Groups (no default)
  local sgs
  sgs=$(aws_ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc_id" \
          --query "SecurityGroups[?GroupName!='default'].GroupId" --output text || true)
  for sg in $sgs; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-security-group --group-id "$sg" >/dev/null || true
    ok "Security Group eliminado: $sg"
  done

  # 8) Subnets
  local subnet_ids
  subnet_ids=$(aws_ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc_id" \
                 --query 'Subnets[].SubnetId' --output text || true)
  for sn in $subnet_ids; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-subnet --subnet-id "$sn" >/dev/null || true
    ok "Subnet eliminada: $sn"
  done

  # 9) Internet Gateway (detach + delete)
  local igw_id
  igw_id=$(aws_ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc_id" \
             --query 'InternetGateways[].InternetGatewayId' --output text || true)
  if [[ -n "${igw_id// /}" ]]; then
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 detach-internet-gateway --internet-gateway-id "$igw_id" --vpc-id "$vpc_id" >/dev/null || true
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-internet-gateway --internet-gateway-id "$igw_id" >/dev/null || true
    ok "Internet Gateway eliminado: $igw_id"
  fi

  # 10) VPC
  if [[ "$DRY_RUN" -eq 0 ]]; then
    aws_ec2 delete-vpc --vpc-id "$vpc_id" >/dev/null || true
  fi
  ok "Limpieza completa de ${name:-$vpc_id}"
}

# --- run --------------------------------------------------------------------
VPCS_JSON=$(list_vpcs)
COUNT=$(jq 'length' <<<"$VPCS_JSON")
if [[ "$COUNT" -eq 0 ]]; then
  ok "No se encontraron VPCs para eliminar."
  exit 0
fi

log "Se eliminarán $COUNT VPC(s) en $REGION:"
jq -r '.[] | " - \(.VpcId) \(.Name)"' <<<"$VPCS_JSON"

for row in $(jq -c '.[]' <<<"$VPCS_JSON"); do
  vid=$(jq -r '.VpcId' <<<"$row")
  vnm=$(jq -r '.Name // empty' <<<"$row")
  delete_vpc "$vid" "$vnm"
done
