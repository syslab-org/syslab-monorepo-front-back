// apps/frontend/src/features/networkCanvas/core/useNetworkPlanController.js
import useDeployNetwork from "@/features/networkCanvas/core/useDeployNetwork";

/**
 * Thin controller that wraps useDeployNetwork so MainFlow
 * does not directly depend on the deploy implementation.
 *
 * This prepares the architecture for later splitting:
 *  - plan validation
 *  - terraform preview
 *  - deploy
 *  - snackbar state
 */
export function useNetworkPlanController({
  nodes,
  edges,
  allowCrossVpcPingUI,
  labId,
  canvasId,
  firestoreVpcId,
}) {
  const deploy = useDeployNetwork({
    nodes,
    edges,
    allowCrossVpcPingUI,
    labId,
    canvasId,
    firestoreVpcId,
  });

  return deploy;
}
