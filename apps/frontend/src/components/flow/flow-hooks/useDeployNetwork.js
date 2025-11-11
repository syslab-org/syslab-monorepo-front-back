// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RouterPolicy } from "../../../config/networking";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { api } from "../../../lib/api";
import { decideRouterMode } from "../../../utils/decideRouterMode";
import useCidrBlockVPCStore from "../store/cidrBlocksIp";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_ROUTER_NODE, TYPE_VPC_NODE } from "../utils/constants";
import {
  groupInstancesBySubnet,
  groupSubnetsByVpc,
  validateTopology,
} from "../utils/topologyValidation";

function s(v) {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number" || t === "boolean") return String(v);
  return "";
}

function normalizeAz(region, az) {
  const OK =
    /^(af|ap|ca|eu|il|me|sa|us)-(central|north|south|southeast|east|west|northeast|south-2|east-2|west-2|gov-[a-z]+|\w+)-\d+[a-f]$/i;
  if (OK.test(az || "")) return az;

  let r = (region || "us-east-1").toLowerCase();
  r = r.replace(/([a-f])$/i, "");

  let out = (az || "").toLowerCase();
  out = out
    .replace("us-eas-", "us-east-")
    .replace(/-a1\b/, "-1a")
    .replace(/-b1\b/, "-1b")
    .replace(/-c1\b/, "-1c")
    .replace(/-d1\b/, "-1d")
    .replace(/-e1\b/, "-1e");

  if (OK.test(out)) return out;
  return `${r}a`;
}

const resolveSubnetName = (sn) => sn?.data?.subnetName || `subnet-${sn.id}`;

function buildLinksFromEdges(nodes, edges) {
  const idToType = new Map(nodes.map((n) => [n.id, n.type]));
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const routerToVpcs = new Map();

  edges.forEach((e) => {
    const sType = idToType.get(e.source);
    const tType = idToType.get(e.target);
    const isVpcRouter =
      (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
      (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);
    if (!isVpcRouter) return;

    const routerId = sType === TYPE_ROUTER_NODE ? e.source : e.target;
    const vpcId = sType === TYPE_VPC_NODE ? e.source : e.target;
    if (!routerToVpcs.has(routerId)) routerToVpcs.set(routerId, new Set());
    routerToVpcs.get(routerId).add(vpcId);
  });

  const links = [];
  const routers = [];

  for (const [routerId, vpcSet] of routerToVpcs.entries()) {
    const vpcs = Array.from(vpcSet);
    if (vpcs.length < 2) continue;

    const routerNode = idToNode.get(routerId);
    const routerData = routerNode?.data || {};
    const router = {
      id: routerId,
      name: routerData.name || routerNode.id,
      connectedVpcIds: vpcs,
      mode: routerData.mode || RouterPolicy.defaultMode,
      allowCrossVpcPing: !!routerData.allowCrossVpcPing,
    };

    const mode = decideRouterMode(router);

    if (mode === "tgw") {
      routers.push({ id: router.id, name: router.name, type: "tgw" });
      vpcs.forEach((vpcId) => {
        const subnetsForVpc = groupSubnetsByVpc(nodes, vpcId);
        const subnetNames = subnetsForVpc.map(resolveSubnetName);
        links.push({
          type: "tgw-attach",
          router_id: router.id,
          vpc_id: vpcId,
          subnet_names: subnetNames,
        });
      });
    } else {
      for (let i = 0; i < vpcs.length; i++) {
        for (let j = i + 1; j < vpcs.length; j++) {
          links.push({
            type: "peering",
            via_router_id: router.id,
            vpc_a_id: vpcs[i],
            vpc_b_id: vpcs[j],
          });
        }
      }
    }
  }

  return { links, routers };
}

const useDeployNetwork = ({ nodes, edges, allowCrossVpcPingUI = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transformedData, setTransformedData] = useState(null);
  const [planName, setPlanName] = useState("");
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const { setLoadingFlow } = useContext(LoadingFlowContext);
  const [simulateOnly, setSimulateOnly] = useState(true);

  const { vlanName, vlanRegion, cidrBlockVPC, prefixLength } =
    useCidrBlockVPCStore((s) => [
      s.vlanName,
      s.vlanRegion,
      s.cidrBlockVPC,
      s.prefixLength,
    ]);

  const processJsonToCloud = () => {
    const { errors, warnings } = validateTopology(nodes, edges);
    if (errors.length > 0) {
      setErrorMessage(
        "No se puede desplegar. Corrige estos errores:\n" +
        errors.map((e) => `• ${e}`).join("\n")
      );
      return;
    }
    if (warnings.length) console.warn(warnings.join("\n"));

    const preview = buildRoutingPreview(nodes, edges);

    const vpcNodes = nodes.filter((n) => n.type === TYPE_VPC_NODE);
    if (!vpcNodes.length) {
      setErrorMessage("No hay VPC en el canvas.");
      return;
    }

    const vpcsPayload = vpcNodes.map((vpcNode) => {
      const name = vpcNode.data?.vpcName || vpcNode.data?.title || vpcNode.id;
      const region = vpcNode.data?.region || "us-east-1";
      const cidr =
        vpcNode.data?.cidrBlock && vpcNode.data?.prefixLength
          ? `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}`
          : null;

      const subnetsRaw = groupSubnetsByVpc(nodes, vpcNode.id).map((sn) => {
        const az = normalizeAz(region, sn.data?.availabilityZone);
        const isPublic = (sn.data?.subnetType || "").toLowerCase() === "public";

        const instances = groupInstancesBySubnet(nodes, sn.id).map((inst) => {
          const name = inst.data?.name || `vm-${sn.id}`;
          const instanceType = inst.data?.instanceType || "t2.micro";
          const keypair = s(inst.data?.sshAccess);
          const ami = s(inst.data?.ami);
          const ip = s(inst.data?.ipAddress);
          const associatePublic =
            typeof inst.data?.associate_public_ip === "boolean"
              ? inst.data.associate_public_ip
              : isPublic;

          return {
            id: inst.id,
            name,
            ami,
            instance_type: instanceType,
            ip_address: ip,
            ssh_access: keypair,
            associate_public_ip: !!associatePublic,
          };
        });

        const routeTableName = isPublic ? "public" : "private";

        return {
          name: resolveSubnetName(sn),
          cidr_block: sn.data?.cidrBlock,
          availability_zone: az,
          map_public_ip_on_launch: !!isPublic,
          subnet_type: sn.data?.subnetType,
          route_table: routeTableName,
          instances,
        };
      });

      const hasPublic = subnetsRaw.some(
        (s) => (s.subnet_type || "").toLowerCase() === "public"
      );
      const hasPrivate = subnetsRaw.some(
        (s) => (s.subnet_type || "").toLowerCase() === "private"
      );

      const pv = preview.vpcs.find((p) => p.id === vpcNode.id);
      const previewRoutes = (pv?.main_route_table || []).map((r) => {
        const t = String(r.target || "").toLowerCase();
        const isNat = t === "nat" || t === "nat-gw" || t === "natgateway";
        const isIgw = t === "igw" || t === "internet-gateway";
        return {
          dest_cidr: isNat ? "0.0.0.0/0" : r.dest_cidr,
          target: isNat ? "nat" : isIgw ? "igw" : r.target,
          via_router_id: r.via_router_id || null,
        };
      });

      const publicRoutes = [];
      const hasIgwInPreview = previewRoutes.some(
        (r) => String(r.target).toLowerCase() === "igw"
      );
      if (hasPublic || hasIgwInPreview) {
        publicRoutes.push({
          name: "igw-default",
          dest_cidr: "0.0.0.0/0",
          target: "igw",
        });
      }

      const privateRoutes = [];

      const routeTables = [];
      if (hasPublic || publicRoutes.length) {
        routeTables.push({ name: "public", routes: publicRoutes });
      }
      if (hasPrivate) {
        routeTables.push({ name: "private", routes: privateRoutes });
      }
      if (!routeTables.length) {
        routeTables.push({ name: "main", routes: [] });
        subnetsRaw.forEach((snb) => (snb.route_table = "main"));
      }

      const natEnabled = !!vpcNode.data?.enableNatGateway;

      return {
        id: vpcNode.id,
        name,
        region,
        cidr_block: cidr,
        internet_gateway: !!vpcNode.data?.internetGateway,
        nat_gateway: {
          enabled: natEnabled,
          public_subnet: natEnabled ? s(vpcNode.data?.natGatewayPublicSubnet) : "",
          elastic_ip: natEnabled ? s(vpcNode.data?.natGatewayElasticIp) : "",
        },
        route_tables: routeTables,
        subnets: subnetsRaw,
        allowed_ssh_cidr: s(vpcNode.data?.allowedSshCidr),
      };
    });

    const { links, routers } = buildLinksFromEdges(nodes, edges);

    const firstVpcCidr = vpcsPayload[0]?.cidr_block || "";
    const masterCidr =
      cidrBlockVPC && prefixLength
        ? `${cidrBlockVPC}/${prefixLength}`
        : firstVpcCidr;

    const vlanNameFinal =
      vlanName || vpcsPayload[0]?.name || `VLAN-${Date.now()}`;
    const vlanRegionFinal =
      vlanRegion || vpcsPayload[0]?.region || "us-east-1";

    const planDefaultName = vpcsPayload[0]?.name || `plan-${Date.now()}`;
    setPlanName(planDefaultName);

    const anyLinks = links.length > 0;
    const someRouterForcesPing = nodes
      .filter((n) => n.type === TYPE_ROUTER_NODE)
      .some((n) => n.data?.allowCrossVpcPing === true);

    const autoAllowCrossVpcPing = someRouterForcesPing || anyLinks;
    const allowCrossVpcPing =
      allowCrossVpcPingUI !== null ? allowCrossVpcPingUI : autoAllowCrossVpcPing;

    const built = {
      name: planDefaultName,
      cloud: "aws",
      vlan: { name: vlanNameFinal, region: vlanRegionFinal, master_cidr: masterCidr },
      vpcs: vpcsPayload,
      links,
      routers,
      // SIEMPRE presente para evitar Jinja Undefined:
      allow_cross_vpc_ping: !!allowCrossVpcPing,
    };

    setTransformedData(built);
    console.log("processJsonToCloud - transformedData:", { cloud: "aws", ...built });
    setShowConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirmation(false);
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (!simulateOnly) {
        const txt = window.prompt("Para confirmar escribe: DEPLOY");
        if (txt !== "DEPLOY") {
          setLoadingFlow(false);
          setErrorMessage("Deploy cancelado por el usuario.");
          return;
        }
      }

      const res = await api.createPlan({
        name: planName || "plan-" + Date.now(),
        ...transformedData,
        simulate_only: simulateOnly,
      });

      setLoadingFlow(false);
      setSuccessMessage(`Plan creado. task_id=${res.task_id || "?"}`);
      navigate(`/admin/plans/${res.plan_id || "?"}`);
    } catch (error) {
      setLoadingFlow(false);
      setErrorMessage(
        `Fallo al crear el Plan: ${error?.message || "Error desconocido"}`
      );
    }
  };

  const handleCancelDeploy = () => {
    setShowConfirmation(false);
    setTransformedData(null);
  };

  const handleCloseSnackbar = (_e, reason) => {
    if (reason === "clickaway") return;
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return {
    showConfirmation,
    transformedData,
    planName,
    setPlanName,
    simulateOnly,
    setSimulateOnly,
    successMessage,
    errorMessage,
    processJsonToCloud,
    handleCancelDeploy,
    handleConfirmDeploy,
    handleCloseSnackbar,
  };
};

export default useDeployNetwork;
