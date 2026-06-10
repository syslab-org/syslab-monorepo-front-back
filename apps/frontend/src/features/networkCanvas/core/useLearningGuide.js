import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { getCanvasProviderDefinition } from "@/features/networkCanvas/providers/providerCatalog";
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

const buildFocusedGuide = ({
  selectedNode,
  nodes,
  edges,
  t,
  providerKey,
  providerDefinition,
}) => {
  if (!selectedNode) return null;

  const label = resolveNodeLabel(selectedNode, t('canvas.learningGuide.focus.element'));
  const providerLabel = providerDefinition.label || String(providerKey || "aws").toUpperCase();
  const isAwsProvider = providerKey === "aws";

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
    const providerLines = isAwsProvider
      ? [
        t('canvas.learningGuide.focus.segmentAwsVpc', {
          region: selectedNode.data?.region || "us-east-1",
        }),
        hasIgw
          ? t('canvas.learningGuide.focus.igwCreated')
          : t('canvas.learningGuide.focus.igwMissing'),
        hasNat
          ? t('canvas.learningGuide.focus.natCreated')
          : t('canvas.learningGuide.focus.natMissing'),
        hasNat
          ? t('canvas.learningGuide.focus.natEipDefined')
          : t('canvas.learningGuide.focus.natEipLater'),
        sshCidr
          ? t('canvas.learningGuide.focus.sshRule', { value: sshCidr })
          : t('canvas.learningGuide.focus.noSshRule'),
      ]
      : [
        t('canvas.learningGuide.focus.segmentProviderNetwork', {
          provider: providerLabel,
          networkKind: providerDefinition.segment?.kindLabel || "network",
          region: selectedNode.data?.region || "us-east-1",
        }),
        hasNat
          ? t('canvas.learningGuide.focus.providerManagedEgressOn', {
            managedEgressLabel: providerDefinition.segment?.managedEgressLabel || "managed egress",
          })
          : t('canvas.learningGuide.focus.providerManagedEgressOff', {
            managedEgressLabel: providerDefinition.segment?.managedEgressLabel || "managed egress",
          }),
        sshCidr
          ? t('canvas.learningGuide.focus.providerFirewallRule', {
            provider: providerLabel,
            value: sshCidr,
          })
          : t('canvas.learningGuide.focus.providerNoFirewallRule'),
      ];

    return {
      title: t('canvas.learningGuide.focus.segmentTitle', { label }),
      subtitle: t('canvas.learningGuide.focus.segmentSubtitleProvider', { provider: providerLabel }),
      badges: [
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}/${selectedNode.data?.prefixLength || "?"}`),
        makeBadge(hasIgw ? t('canvas.learningGuide.focus.internetEdgeOn') : t('canvas.learningGuide.focus.internetEdgeOff'), hasIgw ? "success" : "default"),
        makeBadge(hasNat ? t('canvas.learningGuide.focus.managedEgressOn') : t('canvas.learningGuide.focus.managedEgressOff'), hasNat ? "warning" : "default"),
        makeBadge(sshCidr ? t('canvas.learningGuide.focus.sshExposed') : t('canvas.learningGuide.focus.sshHidden'), sshCidr ? "info" : "default"),
      ],
      labLines: [
        t('canvas.learningGuide.focus.segmentLabDomain'),
        publicSubnets > 0
          ? t('canvas.learningGuide.focus.publicZones', { count: publicSubnets })
          : t('canvas.learningGuide.focus.noPublicZones'),
        privateSubnets > 0
          ? t('canvas.learningGuide.focus.privateZones', { count: privateSubnets })
          : t('canvas.learningGuide.focus.noPrivateZones'),
      ],
      providerLines,
      whyItMatters: t('canvas.learningGuide.focus.segmentWhy'),
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
    const providerLines = isAwsProvider
      ? [
        mode === "tgw"
          ? t('canvas.learningGuide.focus.routerHubAws', { count: connectedVpcs.size })
          : t('canvas.learningGuide.focus.routerPeeringAws'),
        mode === "tgw"
          ? t('canvas.learningGuide.focus.routerHubRoute')
          : t('canvas.learningGuide.focus.routerPeeringRoute'),
      ]
      : [
        mode === "tgw"
          ? t('canvas.learningGuide.focus.routerHubProvider', {
            provider: providerLabel,
            hubLabel: providerDefinition.router?.hubLabel || "routing hub",
            count: connectedVpcs.size,
          })
          : t('canvas.learningGuide.focus.routerDirectProvider', {
            provider: providerLabel,
            directLabel: providerDefinition.router?.directLabel || "direct links",
          }),
        mode === "tgw"
          ? t('canvas.learningGuide.focus.routerHubRouteProvider', {
            hubLabel: providerDefinition.router?.hubLabel || "routing hub",
          })
          : t('canvas.learningGuide.focus.routerDirectRouteProvider', {
            directLabel: providerDefinition.router?.directLabel || "direct links",
          }),
      ];

    return {
      title: t('canvas.learningGuide.focus.routerTitle', { label }),
      subtitle: mode === "tgw" ? t('canvas.learningGuide.focus.routerHub') : t('canvas.learningGuide.focus.routerDirect'),
      badges: [
        makeBadge(mode === "tgw" ? t('canvas.learningGuide.focus.routerHubMode') : t('canvas.learningGuide.focus.routerDirectMode'), mode === "tgw" ? "primary" : "secondary"),
        makeBadge(t('canvas.learningGuide.focus.connectedSegments', { count: connectedVpcs.size })),
        makeBadge(t('canvas.learningGuide.focus.declaredPolicies', { count: routeTable.length })),
        makeBadge(oneWayRoutes > 0 ? t('canvas.learningGuide.focus.missingReturns', { count: oneWayRoutes }) : t('canvas.learningGuide.focus.roundTripPolicies'), oneWayRoutes > 0 ? "warning" : "success"),
      ],
      labLines: [
        mode === "tgw"
          ? t('canvas.learningGuide.focus.routerHubLab')
          : t('canvas.learningGuide.focus.routerDirectLab'),
        t('canvas.learningGuide.focus.policyRows'),
      ],
      providerLines,
      whyItMatters: t('canvas.learningGuide.focus.routerWhy'),
    };
  }

  if (selectedNode.type === TYPE_SUBNETWORK_NODE) {
    const subnetType = String(selectedNode.data?.subnetType || "").toLowerCase();
    const routeTable = selectedNode.data?.routeTable || "main";
    const providerLines = isAwsProvider
      ? [
        t('canvas.learningGuide.focus.subnetAws'),
        subnetType === "public"
          ? t('canvas.learningGuide.focus.subnetPublicRule')
          : t('canvas.learningGuide.focus.subnetPrivateRule'),
      ]
      : [
        t('canvas.learningGuide.focus.subnetProvider', {
          provider: providerLabel,
          subnetKind: providerDefinition.subnet?.kindLabel || "subnet",
        }),
        subnetType === "public"
          ? t('canvas.learningGuide.focus.subnetProviderPublicRule')
          : t('canvas.learningGuide.focus.subnetProviderPrivateRule'),
      ];
    return {
      title: t('canvas.learningGuide.focus.zoneTitle', { label }),
      subtitle: t('canvas.learningGuide.focus.zoneSubtitle'),
      badges: [
        makeBadge(subnetType === "public" ? t('canvas.learningGuide.focus.publicZone') : t('canvas.learningGuide.focus.privateZone'), subnetType === "public" ? "success" : "default"),
        makeBadge(`CIDR ${selectedNode.data?.cidrBlock || "n/a"}`),
        makeBadge(t('canvas.learningGuide.focus.routeTable', { value: routeTable })),
      ],
      labLines: [
        subnetType === "public"
          ? t('canvas.learningGuide.focus.publicZoneLab')
          : t('canvas.learningGuide.focus.privateZoneLab'),
      ],
      providerLines,
      whyItMatters: t('canvas.learningGuide.focus.zoneWhy'),
    };
  }

  if (
    selectedNode.type === TYPE_COMPUTER_NODE ||
    selectedNode.type === TYPE_SERVER_NODE ||
    selectedNode.type === TYPE_PRINTER_NODE
  ) {
    const hasPublicIp = Boolean(selectedNode.data?.associatePublicIp);
    const accessValue = selectedNode.data?.ssh_access || selectedNode.data?.sshAccess || "n/a";
    const providerLines = isAwsProvider
      ? [
        t('canvas.learningGuide.focus.workloadAws'),
        hasPublicIp
          ? t('canvas.learningGuide.focus.workloadPublicAccess')
          : t('canvas.learningGuide.focus.workloadPrivateAccess'),
      ]
      : [
        t('canvas.learningGuide.focus.workloadProvider', {
          provider: providerLabel,
        }),
        hasPublicIp
          ? t('canvas.learningGuide.focus.workloadProviderPublicAccess')
          : t('canvas.learningGuide.focus.workloadProviderPrivateAccess'),
      ];
    return {
      title: t('canvas.learningGuide.focus.workloadTitle', { label }),
      subtitle: t('canvas.learningGuide.focus.workloadSubtitle'),
      badges: [
        makeBadge(selectedNode.data?.instanceType || selectedNode.data?.instance_type || "tipo n/a"),
        makeBadge(hasPublicIp ? t('canvas.learningGuide.focus.publicIp') : t('canvas.learningGuide.focus.privateOnly'), hasPublicIp ? "info" : "default"),
        makeBadge(`${providerDefinition.instance?.sshFieldLabel || "Access"} ${accessValue}`),
      ],
      labLines: [
        t('canvas.learningGuide.focus.workloadLab'),
      ],
      providerLines,
      whyItMatters: t('canvas.learningGuide.focus.workloadWhy'),
    };
  }

  return {
    title: label,
    subtitle: t('canvas.learningGuide.focus.defaultSubtitle'),
    badges: [],
    labLines: [t('canvas.learningGuide.focus.defaultLine')],
    providerLines: [],
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
  targetProvider = "aws",
}) {
  const { t, i18n } = useTranslation();
  return useMemo(() => {
    const providerKey = String(targetProvider || "aws").trim().toLowerCase() || "aws";
    const providerDefinition = getCanvasProviderDefinition(providerKey);
    const providerLabel = providerDefinition.label || providerKey.toUpperCase();
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
    const workloadsWithPublicIp = instances.filter(
      (instance) => Boolean(instance.data?.associatePublicIp || instance.data?.associate_public_ip),
    ).length;
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
        description: t('canvas.learningGuide.steps.deploy.description', { provider: providerLabel }),
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
      nextAction = t('canvas.learningGuide.nextAction.deploy', { provider: providerLabel });
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

    const providerLines = providerKey === "aws"
      ? [
        t('canvas.learningGuide.contrast.awsLines.vpcs', { vpcs: vpcs.length, subnets: subnets.length }),
        t('canvas.learningGuide.contrast.awsLines.egress', { igw: igwCount, nat: natCount }),
        t('canvas.learningGuide.contrast.awsLines.routers', { peering: peeringRouters, tgw: tgwRouters }),
        routersWithRoutes > 0
          ? t('canvas.learningGuide.contrast.awsLines.routesReady')
          : t('canvas.learningGuide.contrast.awsLines.routesMissing'),
        oneWayPairs > 0
          ? t('canvas.learningGuide.contrast.awsLines.oneWayPairs', { count: oneWayPairs })
          : t('canvas.learningGuide.contrast.awsLines.noOneWayPairs'),
      ]
      : [
        t('canvas.learningGuide.contrast.providerLines.vpcs', {
          provider: providerLabel,
          segments: vpcs.length,
          zones: subnets.length,
          networkKind: providerDefinition.segment?.kindLabel || "network",
          subnetKind: providerDefinition.subnet?.kindLabel || "subnet",
        }),
        t('canvas.learningGuide.contrast.providerLines.egress', {
          internetEdgeLabel: providerDefinition.segment?.internetEdgeLabel || "internet edge",
          internetEdgeCount: workloadsWithPublicIp,
          managedEgressLabel: providerDefinition.segment?.managedEgressLabel || "managed egress",
          managedEgressCount: natCount,
        }),
        t('canvas.learningGuide.contrast.providerLines.routers', {
          provider: providerLabel,
          directLabel: providerDefinition.router?.directLabel || "direct links",
          directCount: peeringRouters,
          hubLabel: providerDefinition.router?.hubLabel || "routing hub",
          hubCount: tgwRouters,
        }),
        routersWithRoutes > 0
          ? t('canvas.learningGuide.contrast.providerLines.routesReady', { provider: providerLabel })
          : t('canvas.learningGuide.contrast.providerLines.routesMissing', { provider: providerLabel }),
        oneWayPairs > 0
          ? t('canvas.learningGuide.contrast.providerLines.oneWayPairs', { count: oneWayPairs })
          : t('canvas.learningGuide.contrast.providerLines.noOneWayPairs'),
      ];

    const conceptMap = [
      {
        concept: t('canvas.learningGuide.concepts.segmentation.concept'),
        vlanView: t('canvas.learningGuide.concepts.segmentation.vlan'),
        providerView: providerKey === "aws"
          ? t('canvas.learningGuide.concepts.segmentation.aws')
          : `${providerDefinition.segment?.kindLabel || "Network"} y ${providerDefinition.subnet?.kindLabel || "subnets"} con CIDR reales`,
      },
      {
        concept: t('canvas.learningGuide.concepts.gateway.concept'),
        vlanView: t('canvas.learningGuide.concepts.gateway.vlan'),
        providerView: providerKey === "aws"
          ? t('canvas.learningGuide.concepts.gateway.aws')
          : `${providerDefinition.segment?.internetEdgeLabel || "internet edge"} + ${providerDefinition.segment?.managedEgressLabel || "managed egress"} + ${providerDefinition.router?.hubLabel || "routing hub"}`,
      },
      {
        concept: t('canvas.learningGuide.concepts.hosts.concept'),
        vlanView: t('canvas.learningGuide.concepts.hosts.vlan'),
        providerView: providerKey === "aws"
          ? t('canvas.learningGuide.concepts.hosts.aws')
          : `VMs y parametros de acceso en ${providerLabel}`,
      },
      {
        concept: t('canvas.learningGuide.concepts.validation.concept'),
        vlanView: t('canvas.learningGuide.concepts.validation.vlan'),
        providerView: providerKey === "aws"
          ? t('canvas.learningGuide.concepts.validation.aws')
          : `Lectura y validacion orientada a ${providerLabel} antes de habilitar runtime`,
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
        providerLines,
        conceptMap,
      },
      providerLabel,
      focused: buildFocusedGuide({
        selectedNode,
        nodes,
        edges,
        t,
        providerKey,
        providerDefinition,
      }),
    };
  }, [nodes, edges, validationState, canvasState, canvasPlanInfo, selectedNode, targetProvider, t, i18n.resolvedLanguage]);
}

export default useLearningGuide;
