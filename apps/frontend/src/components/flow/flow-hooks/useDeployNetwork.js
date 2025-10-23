// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { api } from "../../../lib/api";
import useCidrBlockVPCStore from "../store/cidrBlocksIp";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_ROUTER_NODE, TYPE_VPC_NODE } from "../utils/constants";
import {
  groupInstancesBySubnet,
  groupSubnetsByVpc,
  validateTopology,
} from "../utils/topologyValidation";

/** Normaliza AZ:
 * - si ya es válida, la deja
 * - si viene "us-east-1", genera "us-east-1a"
 * - si viene algo raro, cae a `${region}a`
 */
function normalizeAz(region, az) {
  const OK =
    /^(af|ap|ca|eu|il|me|sa|us)-(central|north|south|southeast|east|west|northeast|south-2|east-2|west-2|gov-[a-z]+|\w+)-\d+[a-f]$/i;
  if (OK.test(az || "")) return az;

  let r = (region || "us-east-1").toLowerCase();
  r = r.replace(/([a-f])$/i, ""); // quita letra si venía con AZ

  let s = (az || "").toLowerCase();
  s = s.replace("us-eas-", "us-east-");
  s = s
    .replace(/-a1\b/, "-1a")
    .replace(/-b1\b/, "-1b")
    .replace(/-c1\b/, "-1c")
    .replace(/-d1\b/, "-1d")
    .replace(/-e1\b/, "-1e");

  if (OK.test(s)) return s;
  return `${r}a`;
}

/** Construye links lógicos (router<->vpc => peering entre las VPCs conectadas) */
function buildLinksFromEdges(nodes, edges) {
  const idToType = new Map(nodes.map((n) => [n.id, n.type]));
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const routerToVpcs = new Map(); // router -> set(vpcIds)

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
  for (const [routerId, vpcSet] of routerToVpcs.entries()) {
    const vpcs = Array.from(vpcSet);
    if (vpcs.length < 2) continue;

    for (let i = 0; i < vpcs.length; i++) {
      for (let j = i + 1; j < vpcs.length; j++) {
        const a = vpcs[i];
        const b = vpcs[j];

        const idToNodeGet = (id) => idToNode.get(id);
        const vpcA = idToNodeGet(a);
        const vpcB = idToNodeGet(b);
        const cidrA =
          vpcA?.data?.cidrBlock && vpcA?.data?.prefixLength
            ? `${vpcA.data.cidrBlock}/${vpcA.data.prefixLength}`
            : vpcA?.data?.cidr ||
            vpcA?.data?.cidr_block ||
            "";
        const cidrB =
          vpcB?.data?.cidrBlock && vpcB?.data?.prefixLength
            ? `${vpcB.data.cidrBlock}/${vpcB.data.prefixLength}`
            : vpcB?.data?.cidr ||
            vpcB?.data?.cidr_block ||
            "";

        links.push({
          type: "peering",
          via_router_id: routerId,
          vpc_a_id: a,
          vpc_b_id: b,
          // (opcional) aquí podrías llevar reglas declarativas a futuro:
          // routes: { a_to_b: [...], b_to_a: [...] }
        });
      }
    }
  }
  return links;
}

const useDeployNetwork = ({ nodes, edges }) => {
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
    // 1) Validación integral de la topología
    const { errors, warnings } = validateTopology(nodes, edges);
    if (errors.length > 0) {
      const message =
        "No se puede desplegar. Corrige estos errores:\n" +
        errors.map((e) => `• ${e}`).join("\n");
      setErrorMessage(message);
      return;
    }
    if (warnings.length) {
      console.warn(
        "Advertencias (no bloquean):\n" + warnings.join("\n")
      );
    }

    // 2) Preview de ruteo (para construir route_tables por VPC)
    const preview = buildRoutingPreview(nodes, edges);

    // 3) VPCs del canvas
    const vpcNodes = nodes.filter((n) => n.type === TYPE_VPC_NODE);
    if (!vpcNodes.length) {
      setErrorMessage("No hay VPC en el canvas.");
      return;
    }

    const vpcsPayload = vpcNodes.map((vpcNode) => {
      const name =
        vpcNode.data?.vpcName || vpcNode.data?.title || vpcNode.id;
      const region = vpcNode.data?.region || "us-east-1";
      const cidr =
        vpcNode.data?.cidrBlock && vpcNode.data?.prefixLength
          ? `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}`
          : null;

      const pv = preview.vpcs.find((p) => p.id === vpcNode.id);
      const mainRoutes = (pv?.main_route_table || []).map((r, i) => ({
        name: `rt-${i + 1}`,
        dest_cidr: r.dest_cidr,
        target: r.target, // "local" | "igw" | "nat" | "router-..." (peering)
        via_router_id: r.via_router_id || null,
      }));

      // Subnets e instancias agrupadas
      const subnetsOfVpc = groupSubnetsByVpc(nodes, vpcNode.id).map((sn) => {
        const az = normalizeAz(region, sn.data?.availabilityZone);
        const isPublic =
          (sn.data?.subnetType || "").toLowerCase() === "public";

        const instances = groupInstancesBySubnet(nodes, sn.id).map(
          (inst) => {
            const name = inst.data?.name || `vm-${sn.id}`;
            const ami =
              (inst.data?.ami || "").trim() || undefined;
            const instanceType =
              inst.data?.instanceType || "t2.micro";
            const ip =
              (inst.data?.ipAddress || "").trim() || undefined;
            const keypair =
              (inst.data?.sshAccess || "").trim() || undefined;

            // ⬇️ CAMBIO: si en el nodo de instancia viene associate_public_ip (boolean),
            // lo respetamos; si no, heredamos de si la subnet es pública.
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
              associate_public_ip: associatePublic,
            };
          }
        );

        return {
          name: sn.data?.subnetName || `subnet-${sn.id}`,
          cidr_block: sn.data?.cidrBlock,
          availability_zone: az,
          map_public_ip_on_launch: isPublic,
          subnet_type: sn.data?.subnetType,
          route_table: "main",
          instances,
        };
      });

      return {
        id: vpcNode.id,
        name,
        region,
        cidr_block: cidr,
        internet_gateway: !!vpcNode.data?.internetGateway,
        nat_gateway: {
          enabled: !!vpcNode.data?.enableNatGateway,
          public_subnet: vpcNode.data?.natGatewayPublicSubnet || "",
          elastic_ip: vpcNode.data?.natGatewayElasticIp || "",
        },
        route_tables: [{ name: "main", routes: mainRoutes }],
        subnets: subnetsOfVpc,
        allowed_ssh_cidr: vpcNode.data?.allowedSshCidr || "",
      };
    });

    // 4) Links a partir de edges (peering lógico)
    const linksFromEdges = buildLinksFromEdges(nodes, edges);

    // 5) Datos de la VLAN master
    const firstVpcCidr = vpcsPayload[0]?.cidr_block || "";
    const masterCidr =
      cidrBlockVPC && prefixLength
        ? `${cidrBlockVPC}/${prefixLength}`
        : firstVpcCidr;

    const vlanNameFinal =
      vlanName || vpcsPayload[0]?.name || `VLAN-${Date.now()}`;
    const vlanRegionFinal =
      vlanRegion || vpcsPayload[0]?.region || "us-east-1";

    const planDefaultName =
      vpcsPayload[0]?.name || `plan-${Date.now()}`;
    setPlanName(planDefaultName);

    const built = {
      name: planDefaultName,
      cloud: "aws",
      vlan: {
        name: vlanNameFinal,
        region: vlanRegionFinal,
        master_cidr: masterCidr, // (informativo para UI)
      },
      vpcs: vpcsPayload,
      links: linksFromEdges,
      // routers: [] // (cuando agregues TGW)
    };

    setTransformedData(built);
    console.log("processJsonToCloud - transformedData:", {
      cloud: "aws",
      ...built,
    });

    setShowConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirmation(false);
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (!simulateOnly) {
        const txt = window.prompt('Para confirmar escribe: DEPLOY');
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
