#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-east-1}"
PREFIX="${1:-VPC-}"

log()   { printf "%b\n" "$*"; }
ok()    { log "✅ $*"; }
warn()  { log "⚠️  $*"; }
err()   { log "❌ $*" >&2; }

aws_ec2() { aws ec2 --region "$REGION" "$@"; }

log "🔍 Limpiando recursos residuales en $REGION con prefijo \"$PREFIX\"..."

# --- NAT Gateways ------------------------------------------------------------
nat_ids=$(aws_ec2 describe-nat-gateways \
  --filter Name=state,Values=available,deleting,pending \
  --query "NatGateways[?Tags[?Key=='Name' && starts_with(Value, \`$PREFIX\`)]].NatGatewayId" \
  --output text || true)

if [[ -n "${nat_ids// /}" ]]; then
  for nat in $nat_ids; do
    log "Eliminando NAT Gateway: $nat"
    aws_ec2 delete-nat-gateway --nat-gateway-id "$nat" >/dev/null || true
  done
  ok "NAT Gateways marcados para eliminación."
else
  ok "No se encontraron NAT Gateways."
fi

# --- VPC Peering Connections -------------------------------------------------
peer_ids=$(aws_ec2 describe-vpc-peering-connections \
  --query "VpcPeeringConnections[?Status.Code!='deleted' && Tags[?Key=='Name' && starts_with(Value, \`$PREFIX\`)]].VpcPeeringConnectionId" \
  --output text || true)

if [[ -n "${peer_ids// /}" ]]; then
  for pcx in $peer_ids; do
    log "Eliminando Peering Connection: $pcx"
    aws_ec2 delete-vpc-peering-connection --vpc-peering-connection-id "$pcx" >/dev/null || true
  done
  ok "Peering Connections eliminadas."
else
  ok "No se encontraron Peering Connections."
fi

# --- Elastic IPs sin asociación ---------------------------------------------
eip_ids=$(aws_ec2 describe-addresses \
  --query "Addresses[?AssociationId==\`null\` && Tags[?Key=='Name' && starts_with(Value, \`$PREFIX\`)]].AllocationId" \
  --output text || true)

if [[ -n "${eip_ids// /}" ]]; then
  for eip in $eip_ids; do
    log "Liberando Elastic IP: $eip"
    aws_ec2 release-address --allocation-id "$eip" >/dev/null || true
  done
  ok "Elastic IPs liberadas."
else
  ok "No hay Elastic IPs huérfanas."
fi

log ""
ok "🚀 Limpieza completada."
