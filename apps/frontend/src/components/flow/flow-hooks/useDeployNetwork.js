// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { api } from "../../../lib/api";
import useCidrBlockVPCStore from '../store/cidrBlocksIp';
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_ROUTER_NODE, TYPE_VPC_NODE } from "../utils/constants";
import { groupInstancesBySubnet, groupSubnetsByVpc, validateTopology } from "../utils/topologyValidation";

// arriba del archivo
function normalizeAz(region, az) {
  // si está OK (e.g. us-east-1a), la aceptamos
  const ok = /^(af|ap|ca|eu|il|me|sa|us)-(central|north|south|southeast|east|west|northeast|south-2|east-2|west-2|gov-[a-z]+|\w+)-\d+[a-f]$/.test(az || "");
  if (ok) return az;

  // fixes comunes
  let s = (az || "").toLowerCase();
  s = s.replace("us-eas-", "us-east-");   // us-eas-1a -> us-east-1a
  s = s.replace(/-a1\b/, "-1a");          // us-east-a1 -> us-east-1a
  s = s.replace(/-b1\b/, "-1b");
  s = s.replace(/-c1\b/, "-1c");
  s = s.replace(/-d1\b/, "-1d");
  s = s.replace(/-e1\b/, "-1e");
  // última defensa: si sigue mal, forzamos región+’a’
  if (!/^\w+-\w+-\d+[a-f]$/.test(s)) {
    // region tipo "us-east-1" -> "us-east-1a"
    s = `${region}a`;
  }
  return s;
}


function toLegacyPlan(flowPayload, { simulateOnly = true } = {}) {
  // Convierte el payload del flow (v2) al formato legacy (v1) para enviar a la API

  if (!flowPayload || !Array.isArray(flowPayload.vpcs) || flowPayload.vpcs.length === 0) {
    throw new Error("Payload inválido: no hay VPCs.");
  }

  const vpc = flowPayload.vpcs[0]; // Solo la primera VPC

  // --- helpers de normalización ---
  const toRegion = (val) => {
    // us-east-1a -> us-east-1
    if (typeof val !== "string" || !val.trim()) return "us-east-1";
    const s = val.trim();
    const m = s.match(/^([a-z-]+-\d)[a-z]$/i);
    return m ? m[1] : s; // si trae letra de AZ al final, la quitamos
  };

  const toAz = (val, region) => {
    // normaliza AZ: si viene "us-east-1" => "us-east-1a"
    // si ya viene "us-east-1a" la deja igual; si viene raro, fallback `${region}a`
    if (typeof val !== "string" || !val.trim()) return `${region}a`;
    const s = val.trim();
    if (/^([a-z-]+-\d)[a-z]$/i.test(s)) return s;      // ya es AZ
    if (/^([a-z-]+-\d)$/i.test(s)) return `${s}a`;     // es región → AZ por defecto
    return `${region}a`;                                // fallback
  };

  // 1) VPC
  const name = (vpc.name || "lab-red-1").trim();
  const regionRaw = vpc.region || "us-east-1";
  const region = toRegion(regionRaw);
  const cidr = (vpc.cidr_block || vpc.cidr || "").toString().trim();

  if (!cidr) {
    throw new Error("Payload inválido: no hay CIDR para la VPC.");
  }
  if (!cidr.includes("/")) {
    throw new Error(`CIDR inválido para la VPC: "${cidr}" (faltaría el prefijo /xx)`);
  }

  // 2) Subnets
  const subnetsLegacy = (vpc.subnets || []).map((sn) => {
    const azNorm = toAz(sn.availability_zone, region);
    return {
      az: azNorm,
      cidr: sn.cidr_block,
      name: sn.name,
      public: (sn.subnet_type || "").toLowerCase() === "public",
    };
  });

  // 3) Ruta por defecto a Internet (solo si hay NAT o, en modo demo, IGW)
  const routesLegacy = [];
  const hasNat = vpc.nat_gateway && vpc.nat_gateway.enabled;
  const anyPublic = subnetsLegacy.some((s) => s.public);
  const privateSubnet = subnetsLegacy.find((s) => !s.public);
  const publicSubnet = subnetsLegacy.find((s) => s.public);

  if (privateSubnet) {
    if (hasNat) {
      routesLegacy.push({ to: "0.0.0.0/0", via: "nat", from_subnet: privateSubnet.name });
    } else if (anyPublic && publicSubnet) {
      // sin NAT pero con subnet pública → usamos esa pública como origen del IGW
      routesLegacy.push({ to: "0.0.0.0/0", via: "igw", from_subnet: publicSubnet.name });
    }
  } else if (publicSubnet) {
    // topología solo pública: deja salir por IGW desde la pública
    routesLegacy.push({ to: "0.0.0.0/0", via: "igw", from_subnet: publicSubnet.name });
  }

  return {
    name,
    region,                              // <-- región normalizada (sin letra de AZ)
    vpc: { cidr, name: name.replace(/^vlan-?/i, "vpc-") },
    subnets: subnetsLegacy,
    routes: routesLegacy,
    simulate_only: simulateOnly,
  };
}




function buildLinksFromEdges(nodes, edges) {
  const idToType = new Map(nodes.map(n => [n.id, n.type]));
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  // router -> set(vpcIds)
  const routerToVpcs = new Map();

  edges.forEach(e => {
    const sType = idToType.get(e.source);
    const tType = idToType.get(e.target);
    const isVpcRouter =
      (sType === TYPE_VPC_NODE && tType === TYPE_ROUTER_NODE) ||
      (sType === TYPE_ROUTER_NODE && tType === TYPE_VPC_NODE);
    if (!isVpcRouter) return;

    const routerId = (sType === TYPE_ROUTER_NODE) ? e.source : e.target;
    const vpcId = (sType === TYPE_VPC_NODE) ? e.source : e.target;
    if (!routerToVpcs.has(routerId)) routerToVpcs.set(routerId, new Set());
    routerToVpcs.get(routerId).add(vpcId);
  });

  const links = [];
  for (const [routerId, vpcSet] of routerToVpcs.entries()) {
    const vpcs = Array.from(vpcSet);
    if (vpcs.length < 2) continue;

    // todas las combinaciones (A,B)
    for (let i = 0; i < vpcs.length; i++) {
      for (let j = i + 1; j < vpcs.length; j++) {
        const a = vpcs[i];
        const b = vpcs[j];

        const routerNode = idToNode.get(routerId);
        const routeTable = Array.isArray(routerNode?.data?.routeTable)
          ? routerNode.data.routeTable
          : [];

        // si guardaste reglas por VPC origen, puedes adjuntarlas:
        const routes_a_to_b = routeTable
          .filter(r => r.sourceVpcId === a && r.destVpcId === b)
          .map(r => ({ dest_cidr: r.destCidr }));
        const routes_b_to_a = routeTable
          .filter(r => r.sourceVpcId === b && r.destVpcId === a)
          .map(r => ({ dest_cidr: r.destCidr }));

        links.push({
          type: "peering",
          via_router_id: routerId,
          vpc_a_id: a,
          vpc_b_id: b,
          // opcional, solo si quieres llevar rutas declarativas por dirección:
          routes: {
            a_to_b: routes_a_to_b,
            b_to_a: routes_b_to_a
          }
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
  const { vlanName, vlanRegion, cidrBlockVPC, prefixLength } = useCidrBlockVPCStore(
    s => [s.vlanName, s.vlanRegion, s.cidrBlockVPC, s.prefixLength]
  );

  const processJsonToCloud = () => {

    // 1) Validación integral (bloquea deploy si hay errores)
    const { errors, warnings } = validateTopology(nodes, edges);
    if (errors.length > 0) {
      const message =
        "No se puede desplegar. Corrige estos errores:\n" +
        errors.map(e => `• ${e}`).join("\n");
      setErrorMessage(message);
      return;
    }
    if (warnings.length) {
      // opcional, no bloquea
      console.warn("Advertencias (no bloquean):\n" + warnings.join("\n"));
    }

    // 2) Preview de rutas (intra=local, inter=router)
    const preview = buildRoutingPreview(nodes, edges);


    // 3) VPCs del canvas
    const vpcNodes = nodes.filter(n => n.type === TYPE_VPC_NODE);
    if (!vpcNodes.length) { setErrorMessage("No hay VPC en el canvas."); return; }


    const vpcsPayload = vpcNodes.map(vpcNode => {
      const name = vpcNode.data?.vpcName || vpcNode.data?.title || vpcNode.id;
      const region = vpcNode.data?.region || "us-east-1";
      const cidr = vpcNode.data?.cidrBlock && vpcNode.data?.prefixLength
        ? `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}` : null;

      const pv = preview.vpcs.find(p => p.id === vpcNode.id);
      const mainRoutes = (pv?.main_route_table || []).map((r, i) => ({
        name: `rt-${i + 1}`,
        dest_cidr: r.dest_cidr,
        target: r.target,                 // "local" o "router-..."
        via_router_id: r.via_router_id || null
      }));

      const subnetsOfVpc = groupSubnetsByVpc(nodes, vpcNode.id).map(sn => {
        const az = normalizeAz(region, sn.data?.availabilityZone);
        const instances = groupInstancesBySubnet(nodes, sn.id).map(inst => ({
          id: inst.id,
          ami: inst.data?.ami || "ami-default",
          instance_type: inst.data?.instanceType,
          ip_address: inst.data?.ipAddress,
          name: inst.data?.name,
          ssh_access: inst.data?.sshAccess
        }));

        return {
          name: sn.data?.subnetName || `subnet-${sn.id}`,
          cidr_block: sn.data?.cidrBlock,
          availability_zone: az,
          public_ip: sn.data?.publicIp,
          subnet_type: sn.data?.subnetType,
          route_table: "main",
          instances
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
          elastic_ip: vpcNode.data?.natGatewayElasticIp || ""
        },
        route_tables: [{ name: "main", routes: mainRoutes }],
        subnets: subnetsOfVpc
      };
    });

    /// 4) links (peering lógico router<->vpc)

    const linksFromEdges = buildLinksFromEdges(nodes, edges);

    // 5) datos de la VLAN master (nombre, región, CIDR maestro)
    const firstVpcCidr = vpcsPayload[0]?.cidr_block || "";
    const masterCidr = (cidrBlockVPC && prefixLength)
      ? `${cidrBlockVPC}/${prefixLength}`
      : firstVpcCidr;

    const vlanNameFinal = vlanName || vpcsPayload[0]?.name || `VLAN-${Date.now()}`;
    const vlanRegionFinal = vlanRegion || vpcsPayload[0]?.region || "us-east-1";

    const planDefaultName = vpcsPayload[0]?.name || `plan-${Date.now()}`;
    setPlanName(planDefaultName);

    setTransformedData({
      name: planDefaultName,
      cloud: "aws",
      vlan: {
        name: vlanNameFinal,
        region: vlanRegionFinal,
        master_cidr: masterCidr
      },
      vpcs: vpcsPayload,
      links: linksFromEdges
    });


    console.log("processJsonToCloud - transformedData:", { cloud: "aws", vpcs: vpcsPayload });

    setShowConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirmation(false);
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    console.log("handleConfirmDeploy - transformedData:", transformedData);

    try {
      console.log("payload a backend:", { ...transformedData, name: planName, simulate_only: simulateOnly })
      if (!simulateOnly) {
        const txt = window.prompt('Para confirmar escribe: DEPLOY');
        if (txt !== 'DEPLOY') {
          setLoadingFlow(false);
          setErrorMessage('Deploy cancelado por el usuario.');
          return;
        }
      }

      const res = await api.createPlan({
        name: planName || "plan-" + Date.now(),
        ...transformedData,
        simulate_only: simulateOnly
      });


      // 2') Alternativa: solo redirigir al detalle y desde allí el usuario clicka "Deploy"
      setLoadingFlow(false);
      setSuccessMessage(`Plan creado. task_id=${res.task_id || "?"}`);
      navigate(`/admin/plans/${res.plan_id || "?"}`);
    } catch (error) {
      setLoadingFlow(false);
      setErrorMessage("");
      setErrorMessage(`Fallo al crear el Plan: ${error?.message || "Error desconocido"}`);
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
    handleCloseSnackbar
  };
};

export default useDeployNetwork;
