// apps/frontend/src/utils/decideRouterMode.js
export function decideRouterMode(router) {
  // Manual override always wins
  if (router.mode === "peering" || router.mode === "tgw") {
    return router.mode;
  }

  const count = router.connectedVpcIds?.length || 0;

  // If only 2 VPCs, peering is simpler and cheaper
  if (count <= 2) return "peering";

  // If more than 2 VPCs, default to TGW for hub-and-spoke
  return "tgw";
}
