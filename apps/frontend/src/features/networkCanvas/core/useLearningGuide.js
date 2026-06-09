import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
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

const resolveNodeLabel = (node, fallbackLabel) =>
  node?.data?.vpcName ||
  node?.data?.subnetName ||
  node?.data?.name ||
  node?.data?.identifier ||
  node?.data?.label ||
  node?.label ||
  node?.id ||
  fallbackLabel;

const buildFocusedGuide = ({ selectedNode, nodes, edges, t }) => {
  if (!selectedNode) return null;

  const label = resolveNodeLabel(selectedNode, t('canvas.learningGuide.focus.element'));

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
      title: `Network Segment: ${label}`,
      subtitle: t('canvas.learningGuide.focus.segmentSubtitle'),
      badges: [
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}/${selectedNode.data?.prefixLength || "?"}`),
        makeBadge(hasIgw ? t('canvas.learningGuide.focus.internetEdgeOn') : t('canvas.learningGuide.focus.internetEdgeOff'), hasIgw ? "success" : "default"),
        makeBadge(hasNat ? t('canvas.learningGuide.focus.managedEgressOn') : t('canvas.learningGuide.focus.managedEgressOff'), hasNat ? "warning" : "default"),
        makeBadge(sshCidr ? t('canvas.learningGuide.focus.sshExposed') : t('canvas.learningGuide.focus.sshHidden'), sshCidr ? "info" : "default"),
      ],
      labLines: [
        `Este segmento representa un dominio principal de red dentro del laboratorio.`,
        publicSubnets > 0
          ? `Tienes ${publicSubnets} zona(s) pública(s): sirven para bastions o servicios con salida directa.`
          : "No hay zonas públicas; este segmento no está pensado para exposición directa.",
        privateSubnets > 0
          ? `Tienes ${privateSubnets} zona(s) privada(s): sirven para workloads internos.`
          : "No hay zonas privadas; toda la práctica está concentrada en areas públicas o no definidas.",
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
        "Este segmento define el limite principal del laboratorio. A partir de aqui se decide segmentacion, exposicion y conectividad hacia otras redes.",
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
      title: `Connectivity Policy: ${label}`,
      subtitle: mode === "tgw" ? t('canvas.learningGuide.focus.routerHub') : t('canvas.learningGuide.focus.routerDirect'),
      badges: [
        makeBadge(mode === "tgw" ? t('canvas.learningGuide.focus.routerHubMode') : t('canvas.learningGuide.focus.routerDirectMode'), mode === "tgw" ? "primary" : "secondary"),
        makeBadge(t('canvas.learningGuide.focus.connectedSegments', { count: connectedVpcs.size })),
        makeBadge(t('canvas.learningGuide.focus.declaredPolicies', { count: routeTable.length })),
        makeBadge(oneWayRoutes > 0 ? t('canvas.learningGuide.focus.missingReturns', { count: oneWayRoutes }) : t('canvas.learningGuide.focus.roundTripPolicies'), oneWayRoutes > 0 ? "warning" : "success"),
      ],
      labLines: [
        mode === "tgw"
          ? "En el laboratorio este nodo actua como un hub: los segmentos envian trafico al nodo para alcanzar otras redes."
          : "En el laboratorio este nodo representa enlaces directos por pares: cada segmento necesita policies explicitas hacia el otro.",
        "Las filas de policy no son decorativas: determinan quien puede hablar con quien.",
      ],
      awsLines: [
        mode === "tgw"
          ? `AWS implementará 1 Transit Gateway y ${connectedVpcs.size} attachment(s) para los segmentos conectados.`
          : "AWS implementará conexiones VPC Peering entre los pares que realmente queden declarados por policies.",
        mode === "tgw"
          ? "Cada policy hacia TGW enviara trafico al hub central; luego el hub lo reencamina hacia el segmento destino."
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
      title: `Zone Segment: ${label}`,
      subtitle: t('canvas.learningGuide.focus.zoneSubtitle'),
      badges: [
        makeBadge(subnetType === "public" ? t('canvas.learningGuide.focus.publicZone') : t('canvas.learningGuide.focus.privateZone'), subnetType === "public" ? "success" : "default"),
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}`),
        makeBadge(t('canvas.learningGuide.focus.routeTable', { value: routeTable })),
      ],
      labLines: [
        subnetType === "public"
          ? "En el laboratorio esta zona esta pensada para bastions o workloads con salida directa."
          : "En el laboratorio esta zona esta pensada para workloads internos o menos expuestos.",
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
      title: `Workload: ${label}`,
      subtitle: t('canvas.learningGuide.focus.workloadSubtitle'),
      badges: [
        makeBadge(selectedNode.data?.instance_type || "tipo n/a"),
        makeBadge(hasPublicIp ? t('canvas.learningGuide.focus.publicIp') : t('canvas.learningGuide.focus.privateOnly'), hasPublicIp ? "info" : "default"),
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
        "Las pruebas de ping y acceso SSH terminan ocurriendo aqui. Si el workload esta mal ubicado o mal protegido, el laboratorio no sera verificable.",
    };
  }

  return {
    title: label,
    subtitle: t('canvas.learningGuide.focus.defaultSubtitle'),
    badges: [],
    labLines: [t('canvas.learningGuide.focus.defaultLine')],
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
  const { t, i18n } = useTranslation();
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
        title: t('canvas.learningGuide.steps.segment.title'),
        description: t('canvas.learningGuide.steps.segment.description'),
        completed: vpcs.length >= 1,
      },
      {
        id: "subnet_segment",
        title: t('canvas.learningGuide.steps.zones.title'),
        description: t('canvas.learningGuide.steps.zones.description'),
        completed:
          subnets.length >= 2 && publicSubnetCount >= 1 && privateSubnetCount >= 1,
      },
      {
        id: "workload",
        title: t('canvas.learningGuide.steps.workload.title'),
        description: t('canvas.learningGuide.steps.workload.description'),
        completed: instances.length >= 1,
      },
      {
        id: "router",
        title: t('canvas.learningGuide.steps.connectivity.title'),
        description: needsRouter
          ? t('canvas.learningGuide.steps.connectivity.description')
          : t('canvas.learningGuide.steps.connectivity.optional'),
        completed: !needsRouter || (routers.length >= 1 && hasVpcRouterConnection),
      },
      {
        id: "validate",
        title: t('canvas.learningGuide.steps.validate.title'),
        description: t('canvas.learningGuide.steps.validate.description'),
        completed: isValidated,
      },
      {
        id: "deploy",
        title: t('canvas.learningGuide.steps.deploy.title'),
        description: t('canvas.learningGuide.steps.deploy.description'),
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

    let nextAction = t('canvas.learningGuide.nextAction.completed');
    if (isPlanRunning) {
      nextAction = t('canvas.learningGuide.nextAction.running');
    } else if (topology.errors.length > 0) {
      nextAction = t('canvas.learningGuide.nextAction.fixTopology');
    } else if (nextStep?.id === "validate") {
      nextAction = t('canvas.learningGuide.nextAction.validate');
    } else if (nextStep?.id === "deploy") {
      nextAction = t('canvas.learningGuide.nextAction.deploy');
    } else if (nextStep) {
      nextAction = t('canvas.learningGuide.nextAction.nextStep', { title: nextStep.title });
    }

    const vlanLines = [
      t('canvas.learningGuide.contrast.vlanLines.subnets', { count: subnets.length }),
      needsRouter
        ? t('canvas.learningGuide.contrast.vlanLines.needsRouter')
        : t('canvas.learningGuide.contrast.vlanLines.singleDomain'),
      routersWithRoutes > 0
        ? t('canvas.learningGuide.contrast.vlanLines.routesReady')
        : t('canvas.learningGuide.contrast.vlanLines.routesMissing'),
    ];

    const awsLines = [
      t('canvas.learningGuide.contrast.awsLines.vpcs', { vpcs: vpcs.length, subnets: subnets.length }),
      t('canvas.learningGuide.contrast.awsLines.egress', { igw: igwCount, nat: natCount }),
      t('canvas.learningGuide.contrast.awsLines.routers', { peering: peeringRouters, tgw: tgwRouters }),
      routersWithRoutes > 0
        ? t('canvas.learningGuide.contrast.awsLines.routesReady')
        : t('canvas.learningGuide.contrast.awsLines.routesMissing'),
      oneWayPairs > 0
        ? t('canvas.learningGuide.contrast.awsLines.oneWayPairs', { count: oneWayPairs })
        : t('canvas.learningGuide.contrast.awsLines.noOneWayPairs'),
    ];

    const conceptMap = [
      {
        concept: t('canvas.learningGuide.concepts.segmentation.concept'),
        vlanView: t('canvas.learningGuide.concepts.segmentation.vlan'),
        awsView: t('canvas.learningGuide.concepts.segmentation.aws'),
      },
      {
        concept: t('canvas.learningGuide.concepts.gateway.concept'),
        vlanView: t('canvas.learningGuide.concepts.gateway.vlan'),
        awsView: t('canvas.learningGuide.concepts.gateway.aws'),
      },
      {
        concept: t('canvas.learningGuide.concepts.hosts.concept'),
        vlanView: t('canvas.learningGuide.concepts.hosts.vlan'),
        awsView: t('canvas.learningGuide.concepts.hosts.aws'),
      },
      {
        concept: t('canvas.learningGuide.concepts.validation.concept'),
        vlanView: t('canvas.learningGuide.concepts.validation.vlan'),
        awsView: t('canvas.learningGuide.concepts.validation.aws'),
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
      focused: buildFocusedGuide({ selectedNode, nodes, edges, t }),
    };
  }, [nodes, edges, validationState, canvasState, canvasPlanInfo, selectedNode, t, i18n.resolvedLanguage]);
}

export default useLearningGuide;
