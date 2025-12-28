#!/usr/bin/env bash
set -euo pipefail

# destroy_vpcs.sh — Limpieza completa de VPCs creadas por Terraform o manualmente.
# Elimina instancias, peering, subnets, NAT, IGW, SG, RT, ENIs, Endpoints, NACLs, DHCP Options y finalmente la VPC.
#
# Ejemplos:
#   ./destroy_vpcs.sh --prefix VPC-
#   ./destroy_vpcs.sh --vpc-id vpc-0123456789
#   REGION=us-east-1 ./destroy_vpcs.sh --prefix VPC- --dry-run
#
# Nota: En modo --dry-run no borra nada, solo muestra lo que eliminaría.

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
    *) err "Argumento desconocido: $1"; exit 1;;
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
      jq --arg p "$PREFIX" '
        [ .[]
          | select(((.Name // "") | tostring | ascii_downcase) | startswith($p | ascii_downcase))
        ]'
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
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-route --route-table-id "$rt" --destination-cidr-block "$dest_cidr" >/dev/null 2>&1 || true
  done
}

delete_default_routes_any() {
  local vpc_id="$1"
  local rts
  rts=$(aws_ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc_id" \
        --query 'RouteTables[].RouteTableId' --output text || true)
  for rt in $rts; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-route --route-table-id "$rt" --destination-cidr-block 0.0.0.0/0 >/dev/null 2>&1 || true
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-route --route-table-id "$rt" --destination-ipv6-cidr-block ::/0 >/dev/null 2>&1 || true
  done
}

wait_nat_deleted() {
  local vpc_id="$1"
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

  local my_cidr
  my_cidr=$(aws_ec2 describe-vpcs --vpc-ids "$vpc_id" --query 'Vpcs[0].CidrBlock' --output text 2>/dev/null || echo "")

  # Peering
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
      delete_routes_pointing_to "$vpc_id" "$other_cidr"
      [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$pcx" >/dev/null || true
      ok "Peering eliminado: $pcx"
    done <<< "$peers"
  else
    ok "No hay peering"
  fi

  # Instancias
  local inst_ids
  inst_ids=$(aws_ec2 describe-instances --filters "Name=vpc-id,Values=$vpc_id" \
    "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text || true)
  if [[ -n "${inst_ids// /}" ]]; then
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 terminate-instances --instance-ids $inst_ids >/dev/null || true
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 wait instance-terminated --instance-ids $inst_ids || true
    ok "Instancias EC2 eliminadas: ${inst_ids}"
  else
    ok "No hay instancias EC2"
  fi

  delete_default_routes_any "$vpc_id"
  ok "Rutas por defecto eliminadas"

  # NAT + EIPs
  local nat_info nat_ids alloc_ids
  nat_info=$(aws_ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc_id" \
              --query 'NatGateways[].{Id:NatGatewayId,Alloc:NatGatewayAddresses[0].AllocationId}' --output json || echo "[]")
  nat_ids=$(jq -r '.[].Id' <<<"$nat_info" | xargs || true)
  alloc_ids=$(jq -r '.[].Alloc' <<<"$nat_info" | xargs || true)
  for nat in $nat_ids; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-nat-gateway --nat-gateway-id "$nat" >/dev/null || true
    ok "NAT eliminado: $nat"
  done
  [[ "$DRY_RUN" -eq 0 ]] && wait_nat_deleted "$vpc_id"
  for a in $alloc_ids; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 release-address --allocation-id "$a" >/dev/null 2>&1 || true
  done
  ok "Elastic IPs liberadas (si había)"

  # IGW
  local igw_ids
  igw_ids=$(aws_ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc_id" \
             --query 'InternetGateways[].InternetGatewayId' --output text || true)
  for igw in $igw_ids; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 detach-internet-gateway --internet-gateway-id "$igw" --vpc-id "$vpc_id" >/dev/null || true
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-internet-gateway --internet-gateway-id "$igw" >/dev/null || true
    ok "IGW eliminado: $igw"
  done
  [[ -z "${igw_ids// /}" ]] && ok "No hay IGW"

  # Route Tables
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
    ok "Route Table eliminada: $rt"
  done
  [[ -z "${rt_ids// /}" ]] && ok "No hay RTs no-main"

  # SG
  local sgs
  sgs=$(aws_ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc_id" \
         --query "SecurityGroups[?GroupName!='default'].GroupId" --output text || true)
  for sg in $sgs; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-security-group --group-id "$sg" >/dev/null 2>&1 || true
    ok "SG eliminado: $sg"
  done
  [[ -z "${sgs// /}" ]] && ok "No hay SG extra"

  # ENIs
  local enis
  enis=$(aws_ec2 describe-network-interfaces --filters "Name=vpc-id,Values=$vpc_id" \
          --query "NetworkInterfaces[?Status=='available'].NetworkInterfaceId" --output text || true)
  for eni in $enis; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-network-interface --network-interface-id "$eni" >/dev/null 2>&1 || true
  done
  ok "ENIs eliminados (si había)"

  # VPC Endpoints
  local vpce_ids
  vpce_ids=$(aws_ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=$vpc_id" \
              --query 'VpcEndpoints[].VpcEndpointId' --output text || true)
  if [[ -n "${vpce_ids// /}" ]]; then
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-vpc-endpoints --vpc-endpoint-ids $vpce_ids >/dev/null 2>&1 || true
    ok "VPC Endpoints eliminados: $vpce_ids"
  else
    ok "No hay VPC Endpoints"
  fi

  # NACLs personalizadas
  local nacls
  nacls=$(aws_ec2 describe-network-acls --filters "Name=vpc-id,Values=$vpc_id" \
          --query "NetworkAcls[?IsDefault==\`false\`].NetworkAclId" --output text || true)
  for nacl in $nacls; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-network-acl --network-acl-id "$nacl" >/dev/null 2>&1 || true
  done
  ok "NACLs personalizadas eliminadas (si había)"

  # DHCP Options custom
  local dhcp_id
  dhcp_id=$(aws_ec2 describe-vpcs --vpc-ids "$vpc_id" --query 'Vpcs[0].DhcpOptionsId' --output text 2>/dev/null || echo "")
  if [[ -n "$dhcp_id" && "$dhcp_id" != "default" ]]; then
    local in_use
    in_use=$(aws_ec2 describe-vpcs --filters "Name=dhcp-options-id,Values=$dhcp_id" --query 'Vpcs[].VpcId' --output text || true)
    [[ -z "${in_use// /}" && "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-dhcp-options --dhcp-options-id "$dhcp_id" >/dev/null 2>&1 || true
    ok "DHCP Options custom eliminados: $dhcp_id"
  fi

  # Subnets
  local subnets
  subnets=$(aws_ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc_id" \
             --query 'Subnets[].SubnetId' --output text || true)
  for sn in $subnets; do
    [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-subnet --subnet-id "$sn" >/dev/null 2>&1 || true
    ok "Subnet eliminada: $sn"
  done
  [[ -z "${subnets// /}" ]] && ok "No hay subnets"

  # VPC final
  [[ "$DRY_RUN" -eq 0 ]] && aws_ec2 delete-vpc --vpc-id "$vpc_id" >/dev/null 2>&1 || true
  ok "VPC eliminada completamente: ${name:-$vpc_id}"
}

# ---------- Ejecución -----------

VPCS_JSON=$(list_vpcs)
COUNT=$(jq 'length' <<<"$VPCS_JSON")
if [[ "$COUNT" -eq 0 ]]; then
  ok "No se encontraron VPCs (region=$REGION)."
  exit 0
fi

log "Se eliminarán $COUNT VPC(s) en $REGION:"
jq -r '.[] | " - \(.VpcId) \(.Name) (\(.Cidr))"' <<<"$VPCS_JSON"

for row in $(jq -c '.[]' <<<"$VPCS_JSON"); do
  vid=$(jq -r '.VpcId' <<<"$row")
  vnm=$(jq -r '.Name // empty' <<<"$row")
  delete_vpc "$vid" "$vnm"
done

ok "✅ Proceso completado con éxito."
