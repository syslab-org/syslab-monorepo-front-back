// apps/frontend/src/utils/decideRouterMode.js

/**
 * Decide router mode ("peering" | "tgw").
 *
 * IMPORTANT:
 * We do NOT auto-select TGW anymore because many AWS accounts
 * (especially student/dev) hit the Transit Gateway quota limit
 * and Terraform apply fails with TransitGatewayLimitExceeded.
 *
 * Rule:
 * - If the router explicitly requests "tgw", use it.
 * - Otherwise, always default to "peering".
 */
export function decideRouterMode(router) {
  const raw = String(router?.mode || "")
    .trim()
    .toLowerCase();

  // Explicit TGW only
  if (
    raw === "tgw" ||
    raw === "transit" ||
    raw === "transit_gateway" ||
    raw === "transit-gateway"
  ) {
    return "tgw";
  }

  // Default (safe mode)
  return "peering";
}
