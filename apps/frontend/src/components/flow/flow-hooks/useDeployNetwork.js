// apps/frontend/src/components/flow/flow-hooks/useDeployNetwork.js
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { api } from "../../../lib/api";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_VPC_NODE } from "../utils/constants";
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
    if (vpcNodes.length === 0) {
      setErrorMessage("No hay VPC en el canvas.");
      return;
    }

    // 4) Payload final: una VPC por nodo VPC
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

    // 5) Confirmación
    const defaultName = vpcsPayload[0]?.name || `plan-${Date.now()}`;
    setPlanName(defaultName);
    setTransformedData({ cloud: "aws", vpcs: vpcsPayload });
    setShowConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirmation(false);
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    console.log("handleConfirmDeploy - transformedData:", transformedData);

    try {
      // 1) Adaptamos al esquema que el backend espera hoy
      const legacyPlan = toLegacyPlan(transformedData, { simulateOnly });

      // 2) Creamos el plan vía backend (devuelve { ok, plan_id, task_id } con 202)
      const res = await api.createPlan(legacyPlan);
      // // 1) Crear Plan en Django
      // const payload = { name: planName || `plan-${Date.now()}`, payload: transformedData };
      // const created = await api.createPlan(payload);
      // const planId = created.plan_id || created.id;


      // 2) (Opcional) Disparar deploy inmediato:
      // const dep = await api.deployPlan(planId);
      // setSuccessMessage(`Plan creado y deploy iniciado. task_id=${dep.task_id}`);


      // const url_api = user.settings.general.url_api_aws;
      // await axios.post(url_api, transformedData);

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
