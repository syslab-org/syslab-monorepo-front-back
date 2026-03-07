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

export function useLearningGuide({
  nodes,
  edges,
  validationState,
  canvasState,
  canvasPlanInfo,
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
    };
  }, [nodes, edges, validationState, canvasState, canvasPlanInfo]);
}

export default useLearningGuide;
