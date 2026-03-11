import { useMemo } from "react";
import {
  TYPE_COMPUTER_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
} from "@/features/networkCanvas/utils/constants";
import { validateTopology } from "@/features/networkCanvas/utils/topologyValidation";

const isVpcRouterEdge = (edge, idToType) => {
  const sourceType = idToType.get(edge.source);
  const targetType = idToType.get(edge.target);
  return (
    (sourceType === TYPE_VPC_NODE && targetType === TYPE_ROUTER_NODE) ||
    (sourceType === TYPE_ROUTER_NODE && targetType === TYPE_VPC_NODE)
  );
};

const isApplySuccess = (plan) =>
  Boolean(
    plan &&
      plan.applied === true &&
      String(plan.last_action || "").toLowerCase() === "apply" &&
      String(plan.status || "").toUpperCase() === "SUCCESS",
  );

const normalizeMode = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (
    raw === "tgw" ||
    raw === "transit" ||
    raw === "transit_gateway" ||
    raw === "transit-gateway"
  ) {
    return "tgw";
  }
  return "peering";
};

const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);

const makeBadge = (label, tone = "default") => ({ label, tone });

const resolveNodeLabel = (node) =>
  node?.data?.vpcName ||
  node?.data?.subnetName ||
  node?.data?.name ||
  node?.data?.identifier ||
  node?.data?.label ||
  node?.label ||
  node?.id ||
  "Elemento";

const buildFocusedGuide = ({ selectedNode, nodes, edges }) => {
  if (!selectedNode) return null;

  const label = resolveNodeLabel(selectedNode);

  if (selectedNode.type === TYPE_VPC_NODE) {
    const subnets = nodes.filter((node) => node.parentId === selectedNode.id);
    const publicSubnets = subnets.filter(
      (node) => String(node.data?.subnetType || "").toLowerCase() === "public",
    ).length;
    const privateSubnets = subnets.filter(
      (node) => String(node.data?.subnetType || "").toLowerCase() === "private",
    ).length;
    const hasIgw = Boolean(selectedNode.data?.internetGateway);
    const hasNat = Boolean(selectedNode.data?.enableNatGateway);
    const sshCidr = String(selectedNode.data?.allowedSshCidr || "").trim();

    return {
      title: `VPC: ${label}`,
      subtitle: "Qué significa en el laboratorio y cómo se traduce en AWS.",
      badges: [
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}/${selectedNode.data?.prefixLength || "?"}`),
        makeBadge(hasIgw ? "IGW habilitado" : "Sin IGW", hasIgw ? "success" : "default"),
        makeBadge(hasNat ? "NAT habilitado" : "Sin NAT", hasNat ? "warning" : "default"),
        makeBadge(sshCidr ? "SSH desde IP definida" : "SSH no expuesto", sshCidr ? "info" : "default"),
      ],
      labLines: [
        `Esta VPC representa un dominio principal de red dentro del laboratorio.`,
        publicSubnets > 0
          ? `Tienes ${publicSubnets} subnet(s) pública(s): sirven para bastions o servicios con salida directa.`
          : "No hay subnets públicas; este dominio no está pensado para exposición directa.",
        privateSubnets > 0
          ? `Tienes ${privateSubnets} subnet(s) privada(s): sirven para workloads internos.`
          : "No hay subnets privadas; toda la práctica está concentrada en segmentos públicos o no definidos.",
      ],
      awsLines: [
        `AWS creará 1 VPC real en ${selectedNode.data?.region || "us-east-1"} con el CIDR indicado.`,
        hasIgw
          ? "Se creará y adjuntará un Internet Gateway para permitir salida/entrada pública donde existan rutas y SGs."
          : "Sin Internet Gateway, la VPC no tendrá salida pública directa.",
        hasNat
          ? "Se creará 1 NAT Gateway: tus redes privadas podrán salir a Internet, pero no recibir tráfico entrante."
          : "Sin NAT Gateway, las subnets privadas tampoco tendrán salida pública a menos que exista otro camino.",
        hasNat
          ? "Si asignas una Elastic IP al NAT, debe ser un Allocation ID existente de AWS (por ejemplo `eipalloc-...`), no la IP pública visible."
          : "Si luego habilitas NAT y quieres fijar su EIP, usa un Allocation ID real de AWS.",
        sshCidr
          ? `El Security Group abrirá TCP/22 desde ${sshCidr}.`
          : "No se abrirá SSH administrativo desde Internet salvo que lo habilites explícitamente.",
      ],
      whyItMatters:
        "La VPC define el límite principal del laboratorio. A partir de aquí se decide segmentación, exposición y conectividad hacia otras redes.",
    };
  }

  if (selectedNode.type === TYPE_ROUTER_NODE) {
    const connectedVpcs = new Set();
    edges.forEach((edge) => {
      if (edge.source === selectedNode.id) connectedVpcs.add(edge.target);
      if (edge.target === selectedNode.id) connectedVpcs.add(edge.source);
    });
    const mode = normalizeMode(selectedNode.data?.mode);
    const routeTable = Array.isArray(selectedNode.data?.routeTable)
      ? selectedNode.data.routeTable
      : [];
    const oneWayRoutes = routeTable.filter(
      (route) =>
        route?.sourceVpcId &&
        route?.destVpcId &&
        route.sourceVpcId !== route.destVpcId &&
        !routeTable.some(
          (candidate) =>
            candidate?.sourceVpcId === route.destVpcId &&
            candidate?.destVpcId === route.sourceVpcId,
        ),
    ).length;

    return {
      title: `Router: ${label}`,
      subtitle: mode === "tgw" ? "Hub central de enrutamiento" : "Conectividad directa entre pares",
      badges: [
        makeBadge(mode === "tgw" ? "Modo TGW" : "Modo Peering", mode === "tgw" ? "primary" : "secondary"),
        makeBadge(`${connectedVpcs.size} VPC(s) conectadas`),
        makeBadge(`${routeTable.length} ruta(s) declaradas`),
        makeBadge(oneWayRoutes > 0 ? `${oneWayRoutes} posible(s) retorno(s) faltante(s)` : "Rutas ida/vuelta coherentes", oneWayRoutes > 0 ? "warning" : "success"),
      ],
      labLines: [
        mode === "tgw"
          ? "En el laboratorio este nodo actúa como un hub: las VPCs envían tráfico al router para alcanzar otras redes."
          : "En el laboratorio este nodo representa enlaces directos por pares: cada VPC necesita rutas explícitas hacia la otra.",
        "Las filas de rutas no son decorativas: determinan quién puede hablar con quién.",
      ],
      awsLines: [
        mode === "tgw"
          ? `AWS implementará 1 Transit Gateway y ${connectedVpcs.size} attachment(s) para las VPCs conectadas.`
          : "AWS implementará conexiones VPC Peering entre los pares que realmente queden declarados por rutas.",
        mode === "tgw"
          ? "Cada ruta hacia TGW enviará tráfico al hub central; luego el hub lo reencamina hacia la VPC destino."
          : "En peering no existe tránsito implícito: A↔B y B↔C no conectan automáticamente A↔C.",
      ],
      whyItMatters:
        "Aquí se define la diferencia entre una topología punto a punto y una topología centralizada. Ese cambio altera tanto la escalabilidad como la forma de razonar el tráfico.",
    };
  }

  if (selectedNode.type === TYPE_SUBNETWORK_NODE) {
    const subnetType = String(selectedNode.data?.subnetType || "").toLowerCase();
    const routeTable = selectedNode.data?.routeTable || "main";
    return {
      title: `Subnet: ${label}`,
      subtitle: "Segmento interno dentro de una VPC.",
      badges: [
        makeBadge(subnetType === "public" ? "Pública" : "Privada", subnetType === "public" ? "success" : "default"),
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}`),
        makeBadge(`Tabla ${routeTable}`),
      ],
      labLines: [
        subnetType === "public"
          ? "En el laboratorio esta subnet está pensada para bastions o workloads con salida directa."
          : "En el laboratorio esta subnet está pensada para workloads internos o menos expuestos.",
      ],
      awsLines: [
        "AWS creará 1 aws_subnet con el CIDR indicado y la asociará a una route table.",
        subnetType === "public"
          ? "Será pública solo si su route table apunta a un Internet Gateway."
          : "Será privada mientras no tenga ruta pública directa.",
      ],
      whyItMatters:
        "La subnet no define conectividad por sí sola; la combinación de route table y Security Group determina su comportamiento real.",
    };
  }

  if (
    selectedNode.type === TYPE_COMPUTER_NODE ||
    selectedNode.type === TYPE_SERVER_NODE ||
    selectedNode.type === TYPE_PRINTER_NODE
  ) {
    const hasPublicIp = Boolean(selectedNode.data?.associatePublicIp);
    const keyPair = selectedNode.data?.ssh_access || selectedNode.data?.sshAccess || "n/a";
    return {
      title: `Instancia: ${label}`,
      subtitle: "Host desde donde se materializa la práctica.",
      badges: [
        makeBadge(selectedNode.data?.instance_type || "tipo n/a"),
        makeBadge(hasPublicIp ? "Con IP pública" : "Solo IP privada", hasPublicIp ? "info" : "default"),
        makeBadge(`Key ${keyPair}`),
      ],
      labLines: [
        "En el laboratorio este nodo representa el equipo final sobre el que harás pruebas o desplegarás servicios.",
      ],
      awsLines: [
        "AWS creará 1 instancia EC2 con la AMI, tipo y key pair definidos.",
        hasPublicIp
          ? "Podrás administrarla desde fuera si la ruta pública y el SG lo permiten."
          : "Solo será alcanzable desde dentro de la red o mediante saltos intermedios.",
      ],
      whyItMatters:
        "Las pruebas de ping y acceso SSH terminan ocurriendo aquí. Si la instancia está mal ubicada o mal protegida, el laboratorio no será verificable.",
    };
  }

  return {
    title: label,
    subtitle: "Explicación contextual del elemento seleccionado.",
    badges: [],
    labLines: ["Selecciona un elemento principal del canvas para ver una lectura pedagógica más precisa."],
    awsLines: [],
    whyItMatters: "",
  };
};

export function useLearningGuide({
  nodes,
  edges,
  validationState,
  canvasState,
  canvasPlanInfo,
  selectedNode,
}) {
  return useMemo(() => {
    const vpcs = nodes.filter((n) => n.type === TYPE_VPC_NODE);
    const subnets = nodes.filter((n) => n.type === TYPE_SUBNETWORK_NODE);
    const routers = nodes.filter((n) => n.type === TYPE_ROUTER_NODE);
    const instances = nodes.filter(
      (n) =>
        n.type === TYPE_COMPUTER_NODE ||
        n.type === TYPE_SERVER_NODE ||
        n.type === TYPE_PRINTER_NODE,
    );

    const idToType = new Map(nodes.map((n) => [n.id, n.type]));
    const hasVpcRouterConnection = edges.some((e) => isVpcRouterEdge(e, idToType));

    const publicSubnetCount = subnets.filter(
      (s) => String(s.data?.subnetType || "").toLowerCase() === "public",
    ).length;
    const privateSubnetCount = subnets.filter(
      (s) => String(s.data?.subnetType || "").toLowerCase() === "private",
    ).length;
    const igwCount = vpcs.filter((v) => Boolean(v.data?.internetGateway)).length;
    const natCount = vpcs.filter((v) => Boolean(v.data?.enableNatGateway)).length;
    const routersWithRoutes = routers.filter(
      (r) => Array.isArray(r.data?.routeTable) && r.data.routeTable.some((rt) => rt?.destCidr),
    ).length;
    const peeringRouters = routers.filter(
      (router) => normalizeMode(router.data?.mode) === "peering",
    ).length;
    const tgwRouters = routers.filter(
      (router) => normalizeMode(router.data?.mode) === "tgw",
    ).length;
    const oneWayPairs = routers.reduce((acc, router) => {
      const routeTable = Array.isArray(router.data?.routeTable)
        ? router.data.routeTable
        : [];
      const pairs = new Map();
      routeTable.forEach((route) => {
        if (!route.sourceVpcId || !route.destVpcId || route.sourceVpcId === route.destVpcId) {
          return;
        }
        const key = pairKey(route.sourceVpcId, route.destVpcId);
        if (!pairs.has(key)) {
          pairs.set(key, {
            a: route.sourceVpcId < route.destVpcId ? route.sourceVpcId : route.destVpcId,
            b: route.sourceVpcId < route.destVpcId ? route.destVpcId : route.sourceVpcId,
            aToB: false,
            bToA: false,
          });
        }
        const pair = pairs.get(key);
        if (route.sourceVpcId === pair.a && route.destVpcId === pair.b) pair.aToB = true;
        if (route.sourceVpcId === pair.b && route.destVpcId === pair.a) pair.bToA = true;
      });
      let partial = 0;
      pairs.forEach((pair) => {
        if (!(pair.aToB && pair.bToA)) partial += 1;
      });
      return acc + partial;
    }, 0);

    const needsRouter = vpcs.length > 1;
    const topology = validateTopology(nodes, edges);

    const normalizedValidation = String(validationState || "").toUpperCase();
    const isValidated = normalizedValidation === "SUCCESS";
    const isPlanRunning = String(canvasState || "").toUpperCase() === "PLAN_RUNNING";
    const hasOutdatedCanvas = String(canvasState || "").toUpperCase() === "PLAN_OUTDATED";
    const appliedReal = isApplySuccess(canvasPlanInfo);

    const steps = [
      {
        id: "vpc_base",
        title: "Crear VPC base",
        description: "Define el contenedor principal del laboratorio.",
        completed: vpcs.length >= 1,
      },
      {
        id: "subnet_segment",
        title: "Segmentar subredes",
        description: "Crea al menos una subred publica y una privada.",
        completed:
          subnets.length >= 2 && publicSubnetCount >= 1 && privateSubnetCount >= 1,
      },
      {
        id: "workload",
        title: "Agregar workload",
        description: "Añade al menos una instancia para probar conectividad.",
        completed: instances.length >= 1,
      },
      {
        id: "router",
        title: "Conectividad entre VPCs",
        description: needsRouter
          ? "Conecta las VPCs con un router y sus enlaces."
          : "Opcional en laboratorio de una sola VPC.",
        completed: !needsRouter || (routers.length >= 1 && hasVpcRouterConnection),
      },
      {
        id: "validate",
        title: "Validar topologia",
        description: "Ejecuta simulacion (Terraform plan) antes del despliegue.",
        completed: isValidated,
      },
      {
        id: "deploy",
        title: "Desplegar en AWS",
        description: "Aplica infraestructura real cuando el laboratorio este validado.",
        completed: appliedReal,
        optional: true,
      },
    ];

    const completed = steps.filter((step) => step.completed).length;
    const required = steps.filter((step) => !step.optional).length;
    const completedRequired = steps.filter(
      (step) => !step.optional && step.completed,
    ).length;
    const progress = Math.round((completed / steps.length) * 100);
    const nextStep = steps.find((step) => !step.completed) || null;

    let nextAction = "Laboratorio completado. Puedes revisar outputs y logs.";
    if (isPlanRunning) {
      nextAction = "Hay una ejecucion en curso. Espera el resultado antes de seguir.";
    } else if (topology.errors.length > 0) {
      nextAction =
        "Corrige primero los errores de topologia para continuar con la validacion.";
    } else if (nextStep?.id === "validate") {
      nextAction =
        "Ejecuta Validar para simular la topologia y revisar el plan antes de aplicar.";
    } else if (nextStep?.id === "deploy") {
      nextAction =
        "Cuando estes conforme con la simulacion, ejecuta Desplegar para crear recursos en AWS.";
    } else if (nextStep) {
      nextAction = `Siguiente paso: ${nextStep.title}.`;
    }

    const vlanLines = [
      `Estas modelando ${subnets.length} segmento(s) de red dentro de un laboratorio logico.`,
      needsRouter
        ? "Tu practica requiere enrutar entre multiples dominios de red."
        : "Tu practica puede resolverse en un dominio principal.",
      routersWithRoutes > 0
        ? "Ya definiste rutas entre segmentos para analizar conectividad."
        : "Aun no definiste rutas explicitas entre segmentos.",
    ];

    const awsLines = [
      `Esto se traduce a ${vpcs.length} VPC(s) y ${subnets.length} subnet(s) en AWS.`,
      `Conectividad de salida: IGW ${igwCount} / NAT ${natCount}.`,
      `Routers en modo AWS: Peering ${peeringRouters} / TGW ${tgwRouters}.`,
      routersWithRoutes > 0
        ? "Las rutas definidas se transforman en route tables y enlaces entre VPCs."
        : "Sin rutas explicitas, AWS solo aplicara conectividad local por VPC.",
      oneWayPairs > 0
        ? `Detectamos ${oneWayPairs} par(es) con ruta de solo ida; revisa retorno para pruebas bidireccionales.`
        : "No se detectan pares con rutas solo de ida.",
    ];

    const conceptMap = [
      {
        concept: "Segmentacion",
        vlanView: "VLAN y subredes logicas para practica",
        awsView: "VPC y subnets con CIDR reales",
      },
      {
        concept: "Gateway",
        vlanView: "Router del laboratorio",
        awsView: "Route tables + IGW/NAT/TGW/Peering",
      },
      {
        concept: "Hosts",
        vlanView: "Equipos/servicios en la topologia",
        awsView: "Instancias EC2 y sus interfaces",
      },
      {
        concept: "Validacion",
        vlanView: "Comprobacion de reglas de topologia",
        awsView: "Terraform plan antes de apply",
      },
    ];

    return {
      stats: {
        vpcs: vpcs.length,
        subnets: subnets.length,
        routers: routers.length,
        instances: instances.length,
        peeringRouters,
        tgwRouters,
      },
      validation: {
        isValidated,
        hasOutdatedCanvas,
        isPlanRunning,
      },
      progress: {
        percent: progress,
        completed,
        total: steps.length,
        completedRequired,
        totalRequired: required,
      },
      steps,
      nextStep,
      nextAction,
      issues: {
        errors: topology.errors,
        warnings: topology.warnings,
      },
      contrast: {
        vlanLines,
        awsLines,
        conceptMap,
      },
      focused: buildFocusedGuide({ selectedNode, nodes, edges }),
    };
  }, [nodes, edges, validationState, canvasState, canvasPlanInfo, selectedNode]);
}

export default useLearningGuide;
