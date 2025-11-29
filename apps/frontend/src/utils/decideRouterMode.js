// apps/frontend/src/utils/decideRouterMode.js
import { RouterPolicy } from "../config/networking";

export function decideRouterMode(router) {
  if (router.mode === "peering" || router.mode === "tgw") {
    return router.mode; // Si el usuario lo definió manualmente
  }

  const count = router.connectedVpcIds?.length || 0;
  return count <= RouterPolicy.peeringMaxVpcs ? "peering" : "tgw";
}
