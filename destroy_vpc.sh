#!/usr/bin/env bash
set -euo pipefail

# destroy_vpcs.sh — Limpieza completa de VPCs creadas por el plan (A y B, peering, NAT, IGW, RTs, subnets...)
#
# Ejemplos:
#   ./destroy_vpcs.sh --prefix VPC-             # destruye todas las VPC cuyo tag Name empieza por "VPC-"
#   ./destroy_vpcs.sh --vpc-id vpc-0123456789   # destruye una VPC específica
#   REGION=us-east-1 ./destroy_vpcs.sh --prefix VPC- --dry-run
#
# Nota: En DRY RUN no se borra nada, solo se listan y muestran pasos.

REGION="${REGION:-us-east-1}"
DRY_RUN=0
VPC_ID=""
PREFIX=""

log()  { printf "%b\n" "$*"; }
ok()   { log "✅ $*"; }
warn() { log "⚠️  $*"; }
err()  { log "❌ $*" >&2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --vpc-id) VPC_ID="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help)
      cat <<EOF
Uso: destroy_vpcs.sh --region <aws-region> [--vpc-id vpc-xxx | --prefix NAME-] [--dry-run]
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

# ---------- Helpers -----------

list_vpcs() {
  if [[ -n "$VPC_ID" ]]; then
    aws_ec2 describe-vpcs --vpc-ids "$VPC_ID" \
      --query 'Vpcs[].{VpcId:VpcId,Name:Tags[?Key==`Name`]|[0].Value,Cidr:CidrBlock}' --output json
  else
    aws_ec2 describe-vpcs \
      --query 'Vpcs[].{VpcId:VpcId,Name:Tags[?Key==`Name`]|[0].Value,Cidr:CidrBlock}' --output json | \
      jq --arg p "$PREFIX" '[ .[] | select((.Name|tostring) | startswith($p)) ]'
  fi
}

delete_routes_pointing_to() {
  local vpc_id="$1"
  local dest_cidr="$2"
  [[ -z "$dest_cidr" || "$dest_cidr" == "None" ]] && return 0
  local rts
  rts=$(aws_ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" \
        --query 'RouteTables[].RouteTableId' --output text || true)
  for rt in $rts; do
    if [[ "$DRY_RUN" -eq 0 ]]; then
      aws_ec2 delete-route --route-table-id "$rt" --destination-cidr-block "$dest_cidr" >/dev/null 2>&1 || true
    fi
  done
}

delete_default_routes_any() {
  local vpc_id="$1"
  local rts
  rts=$(aws_ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" \
        --query 'RouteTables[].RouteTableId' --output text || true)
  for rt in $rts; do
    if [[ "$DRY_RUN" -eq 0 ]]; then
      aws_ec2 delete-route --route-table-id "$rt" --destination-cidr-block 0.0.0.0/0 >/dev/null 2>&1 || true
      aws_ec2 delete-route --route-table-id "$rt" --destination-ipv6-cidr-block ::/0 >/dev/null 2>&1 || true
    fi
  done
}

wait_nat_deleted() {
  local vpc_id="$1"
  # Espera a que no queden NATs en estado != deleted (máx ~3 min)
  for _ in {1..36}; do
    local left
    left=$(aws_ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc_id" \
             --query 'NatGateways[?State!=`deleted`].NatGatewayId' --output text || true)
    [[ -z "${left// /}" ]] && break
    sleep 5
  done
}

# ---------- Borrado por VPC -----------

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

  # CIDR de la VPC
  local my_cidr
  my_cidr=$(aws_ec2 describe-vpcs --vpc-ids "$vpc_id" --query 'Vpcs[0].CidrBlock' --output text 2>/dev/null || echo "")

  # 0) Rutas de peering (primero borrar rutas, luego el peering)
  #    Para rutas necesitamos conocer la otra VPC y su CIDR.
  local peers
  peers=$(aws_ec2 describe-vpc-peering-connections \
    --query "VpcPeeringConnections[?RequesterVpcInfo.VpcId=='$vpc_id' || AccepterVpcInfo.VpcId=='$vpc_id'].[VpcPeeringConnectionId,RequesterVpcInfo.VpcId,AccepterVpcInfo.VpcId]" \
    --output text || true)

  if [[ -n "${peers// /}" ]]; then
    while read -r pcx req acc; do
      [[ -z "$pcx" ]] && continue
      local other_vpc="$req"
      [[ "$req" == "$vpc_id" ]] && other_vpc="$acc"
      local other_cidr
      other_cidr=$(aws_ec2 describe-vpcs --vpc-ids "$other_vpc" --query 'Vpcs[0].CidrBlock' --output text 2>/dev/null || echo "")
      # Borra rutas hacia la otra VPC en TODAS las tablas de esta VPC
      delete_routes_pointing_to "$vpc_id" "$other_cidr"
      # Y viceversa: si luego limpiamos la otra VPC, también lo hará allí.
      if [[ "$DRY_RUN" -eq 0 ]]; then
        aws_ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$pcx" >/dev/null || true
      fi
      ok "Peering eliminado: $pcx"
    done <<< "$peers"
  else
    ok "No hay peering para esta VPC"
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

  # 2) Quitar rutas por defecto (0.0.0.0/0 y ::/0) para desbloquear IGW/NAT/RTs
  delete_default_routes_any "$vpc_id"
  ok "Rutas por defecto eliminadas (0.0.0.0/0, ::/0)"

  # 3) NAT Gateways (y esperar a deleted). Guarda AllocationIds para liberar EIPs.
  local nat_info
  nat_info=$(aws_ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc_id" \
              --query 'NatGateways[].{Id:NatGatewayId,Alloc:NatGatewayAddresses[0].AllocationId}' --output json || echo "[]")
  local nat_ids alloc_ids
  nat_ids=$(jq -r '.[].Id' <<<"$nat_info" | xargs || true)
  alloc_ids=$(jq -r '.[].Alloc' <<<"$nat_info" | xargs || true)

  if [[ -n "${nat_ids// /}" ]]; then
    for nat in $nat_ids; do
      if [[ "$DRY_RUN" -eq 0 ]]; then
        aws_ec2 delete-nat-gateway --nat-gateway-id "$nat" >/dev/null || true
      fi
      ok "NAT eliminado: $nat (puede tardar ~1-2 min)"
    done
    [[ "$DRY_RUN" -eq 0 ]] && wait_nat_deleted "$vpc_id"
  else
    ok "No hay NAT Gateways"
  fi

  # 4) Elastic IPs: libera las asociadas a NAT (AllocationId conocidos) y las etiquetadas *-nat-eip
  if [[ -n "${alloc_ids// /}" && "$DRY_RUN" -eq 0 ]]; then
    for a in $alloc_ids; do
      aws_ec2 release-address --allocation-id "$a" >/dev/null 2>&1 || true
    done
  fi
  # best-effort por tag
  local tagged_eips
  tagged_eips=$(aws_ec2 describe-addresses --filters "Name=tag:Name,Values=*-nat-eip" \
                 --query 'Addresses[].AllocationId' --output text || true)
  if [[ -n "${tagged_eips// /}" && "$DRY_RUN" -eq 0 ]]; then
    for a in $tagged_eips; do
      aws_ec2 release-address --allocation-id "$a" >/dev/null 2>&1 || true
    done
  fi
  ok "Elastic IPs liberadas (si había)"

  # 5) Internet Gateways (detach + delete)
  local igw_ids
  igw_ids=$(aws_ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc_id" \
             --query 'InternetGateways[].InternetGatewayId' --output text || true)
  for igw in $igw_ids; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 detach-internet-gateway --internet-gateway-id "$igw" --vpc-id "$vpc_id" >/dev/null || true
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-internet-gateway --internet-gateway-id "$igw" >/dev/null || true
    ok "Internet Gateway eliminado: $igw"
  done
  [[ -z "${igw_ids// /}" ]] && ok "No hay IGW"

  # 6) Route Tables NO main (desasociar y borrar)
  local rt_ids
  rt_ids=$(aws_ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" \
            --query 'RouteTables[?Associations[?Main!=`true`]].RouteTableId' --output text || true)
  for rt in $rt_ids; do
    local assoc_ids
    assoc_ids=$(aws_ec2 describe-route-tables --route-table-ids "$rt" \
                  --query 'RouteTables[].Associations[].RouteTableAssociationId' --output text || true)
    for a in $assoc_ids; do
      [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 disassociate-route-table --association-id "$a" >/dev/null 2>&1 || true
    done
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-route-table --route-table-id "$rt" >/dev/null 2>&1 || true
    ok "Route table eliminada: $rt"
  done
  [[ -z "${rt_ids// /}" ]] && ok "No hay RTs no-main para borrar"

  # 7) Security Groups (no default)
  local sgs
  sgs=$(aws_ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc_id" \
         --query "SecurityGroups[?GroupName!='default'].GroupId" --output text || true)
  for sg in $sgs; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-security-group --group-id "$sg" >/dev/null 2>&1 || true
    ok "Security Group eliminado: $sg"
  done
  [[ -z "${sgs// /}" ]] && ok "No hay SGs extra"

  # 8) Subnets
  local subnets
  subnets=$(aws_ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc_id" \
             --query 'Subnets[].SubnetId' --output text || true)
  for sn in $subnets; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-subnet --subnet-id "$sn" >/dev/null 2>&1 || true
    ok "Subnet eliminada: $sn"
  done
  [[ -z "${subnets// /}" ]] && ok "No hay subnets"

  # 9) VPC
  if [[ "$DRY_RUN" -eq 0 ]]; then
    aws_ec2 delete-vpc --vpc-id "$vpc_id" >/dev/null 2>&1 || true
  fi
  ok "Limpieza completa de ${name:-$vpc_id}"
}

# ---------- Run -----------

VPCS_JSON=$(list_vpcs)
COUNT=$(jq 'length' <<<"$VPCS_JSON")
if [[ "$COUNT" -eq 0 ]]; then
  ok "No se encontraron VPCs para eliminar (region=$REGION)."
  exit 0
fi

log "Se eliminarán $COUNT VPC(s) en $REGION:"
jq -r '.[] | " - \(.VpcId) \(.Name)  (\(.Cidr))"' <<<"$VPCS_JSON"

# Consejo: si usaste peering entre 2 VPC, es indiferente el orden porque
# este script borra primero rutas y la conexión de peering por cada VPC.
for row in $(jq -c '.[]' <<<"$VPCS_JSON"); do
  vid=$(jq -r '.VpcId' <<<"$row")
  vnm=$(jq -r '.Name // empty' <<<"$row")
  delete_vpc "$vid" "$vnm"
done

ok "✅ Proceso finalizado."
