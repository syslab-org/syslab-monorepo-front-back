import InstanceNode from "@/features/networkCanvas/nodes/InstanceNode";
import RouterNodeInstance from "@/features/networkCanvas/nodes/RouterNodeInstance";
import SubNetworkNodeInstance from "@/features/networkCanvas/nodes/SubNetworkNodeInstance";
import VPCNodeInstance from "@/features/networkCanvas/nodes/VPCNodeInstance";

export const nodeTypes = {
  vpc: VPCNodeInstance,
  subnetwork: SubNetworkNodeInstance,
  router: RouterNodeInstance,
  computer: InstanceNode,
  printer: InstanceNode,
  server: InstanceNode,
};

export const connectionLineStyle = {
  strokeWidth: 2.5,
  stroke: "#2c3e50",
  strokeDasharray: "6 4",
};
