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

/** Helper para usar el MISMO nombre de subnet en payload y en TGW */
const resolveSubnetName = (sn) => sn?.data?.subnetName || `subnet-${sn.id}`;

/** Construye links lógicos (router<->vpc => peering o TGW entre las VPCs conectadas) */
function buildLinksFromEdges(nodes, edges) {
  const idToType = new Map(nodes.map((n) => [n.id, n.type]));
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const routerToVpcs = new Map(); // router -> set(vpcIds)

  // --- Paso 1: identificar qué VPCs están conectadas a cada router ---
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

  // --- Paso 2: construir links según el modo (peering o tgw) ---
  const links = [];
  const routers = [];

  for (const [routerId, vpcSet] of routerToVpcs.entries()) {
    const vpcs = Array.from(vpcSet);
    if (vpcs.length < 2) continue; // nada que conectar

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
      // Declaramos el router lógico TGW
      routers.push({
        id: router.id,
        name: router.name,
        type: "tgw",
      });

      // Adjuntamos cada VPC con las SUBNETS REALES del canvas
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
      // Peering normal entre cada par de VPCs
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
      console.warn("Advertencias (no bloquean):\n" + warnings.join("\n"));
    }

    // 2) Preview de ruteo (para detectar intenciones como NAT/IGW)
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

      // --- subnets & instances
      const subnetsRaw = groupSubnetsByVpc(nodes, vpcNode.id).map((sn) => {
        const az = normalizeAz(region, sn.data?.availabilityZone);
        const isPublic =
          (sn.data?.subnetType || "").toLowerCase() === "public";

        const instances = groupInstancesBySubnet(nodes, sn.id).map((inst) => {
          const name = inst.data?.name || `vm-${sn.id}`;
          const ami = (inst.data?.ami || "").trim() || undefined;
          const instanceType = inst.data?.instanceType || "t2.micro";
          const ip = (inst.data?.ipAddress || "").trim() || undefined;
          const keypair = (inst.data?.sshAccess || "").trim() || undefined;

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
        });

        // asignamos RT por tipo
        const routeTableName = isPublic ? "public" : "private";

        return {
          name: resolveSubnetName(sn),
          cidr_block: sn.data?.cidrBlock,
          availability_zone: az,
          map_public_ip_on_launch: isPublic,
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

      // --- interpretar preview: si había alguna ruta marcada como NAT/IGW en "main",
      //     la normalizamos y la mapeamos a las RT adecuadas.
      const pv = preview.vpcs.find((p) => p.id === vpcNode.id);
      const previewRoutes = (pv?.main_route_table || []).map((r) => {
        const t = String(r.target || "").toLowerCase();
        const isNat =
          t === "nat" || t === "nat-gw" || t === "natgateway";
        const isIgw = t === "igw" || t === "internet-gateway";
        return {
          dest_cidr: isNat ? "0.0.0.0/0" : r.dest_cidr,
          target: isNat ? "nat" : isIgw ? "igw" : r.target,
          via_router_id: r.via_router_id || null,
        };
      });

      // rutas para la tabla pública: si el preview sugiere IGW, la añadimos; si no, añadimos la default por defecto
      const publicRoutes = [];
      const hasIgwInPreview = previewRoutes.some(
        (r) => String(r.target).toLowerCase() === "igw"
      );
      if (hasPublic) {
        if (hasIgwInPreview) {
          publicRoutes.push({
            name: "igw-default",
            dest_cidr: "0.0.0.0/0",
            target: "igw",
          });
        } else {
          publicRoutes.push({
            name: "igw-default",
            dest_cidr: "0.0.0.0/0",
            target: "igw",
          });
        }
      }

      // tabla privada sin default explícita (el template añade 0.0.0.0/0 → NAT si enabled)
      const privateRoutes = [];

      const routeTables = [];
      if (hasPublic) {
        routeTables.push({ name: "public", routes: publicRoutes });
      }
      if (hasPrivate) {
        routeTables.push({ name: "private", routes: privateRoutes });
      }
      // fallback: si por algún motivo no detectamos subnets, crea una "main" vacía
      if (!routeTables.length) {
        routeTables.push({ name: "main", routes: [] });
        subnetsRaw.forEach((s) => (s.route_table = "main"));
      }

      return {
        id: vpcNode.id,
        name,
        region,
        cidr_block: cidr,
        internet_gateway: !!vpcNode.data?.internetGateway,
        nat_gateway: {
          enabled: !!vpcNode.data?.enableNatGateway,
          public_subnet: vpcNode.data?.natGatewayPublicSubnet || "",
          elastic_ip: (vpcNode.data?.natGatewayElasticIp || "").trim(),
        },
        route_tables: routeTables,
        subnets: subnetsRaw,
        allowed_ssh_cidr: vpcNode.data?.allowedSshCidr || "",
      };
    });

    // 4) Links y routers a partir de edges (peering o TGW)
    const { links, routers } = buildLinksFromEdges(nodes, edges);

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

    // ⚠️ Importante: calcularlo desde los nodos ROUTER del canvas, no desde el array `routers`
    const allowCrossVpcPing = nodes
      .filter((n) => n.type === TYPE_ROUTER_NODE)
      .some((n) => n.data?.allowCrossVpcPing === true);

    const built = {
      name: planDefaultName,
      cloud: "aws",
      vlan: {
        name: vlanNameFinal,
        region: vlanRegionFinal,
        master_cidr: masterCidr,
      },
      vpcs: vpcsPayload,
      links,
      routers, // solo se pobla si hubo TGW
      allow_cross_vpc_ping: allowCrossVpcPing,
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
