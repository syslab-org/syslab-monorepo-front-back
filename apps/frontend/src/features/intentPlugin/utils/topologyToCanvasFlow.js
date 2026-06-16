import {
  TITLE_SERVER,
  TITLE_SUBNETWORK,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  TYPE_VPC_NODE,
  widthDefaultInstanceNode,
  heightDefaultInstanceNode,
  widthDefaultSubNetworkNode,
  heightDefaultSubNetworkNode,
  widthDefaultVPCNode,
  heightDefaultVPCNode,
} from "@/features/networkCanvas/utils/constants";

function parseCidrParts(cidr) {
  const raw = String(cidr || "").trim();
  if (!raw.includes("/")) {
    return { cidrBlock: raw, prefixLength: "" };
  }
  const [cidrBlock, prefixLength] = raw.split("/");
  return { cidrBlock, prefixLength: prefixLength || "" };
}

function buildVpcData(segment, provider, networkRegion) {
  const aws = segment?.provider_overrides?.aws || {};
  const natGateway = aws?.nat_gateway || {};
  const { cidrBlock, prefixLength } = parseCidrParts(segment?.cidr);

  return {
    label: `vpc-${segment?.id || "segment"}`,
    title: "VPC",
    vpcName: segment?.name || segment?.id || "VPC",
    name: segment?.name || segment?.id || "VPC",
    region: segment?.region || networkRegion || "us-east-1",
    cidrBlock,
    prefixLength: prefixLength ? Number(prefixLength) : "",
    cloudProvider: provider || "aws",
    internetGateway: !!aws?.internet_gateway,
    enableNatGateway: !!natGateway?.enabled,
    natGatewayPublicSubnet: natGateway?.public_subnet || "",
    natGatewayElasticIp: natGateway?.elastic_ip || "",
    nat_gateway: {
      enabled: !!natGateway?.enabled,
      public_subnet: natGateway?.public_subnet || "",
      elastic_ip: natGateway?.elastic_ip || "",
    },
    allowedSshCidr: segment?.ingress?.ssh_cidr || "",
    provider_overrides: segment?.provider_overrides || {},
  };
}

function buildSubnetData(zone) {
  const aws = zone?.provider_overrides?.aws || {};
  const subnetType = zone?.kind || aws?.subnet_type || "private";

  return {
    label: `subnet-${zone?.id || zone?.name || "zone"}`,
    title: TITLE_SUBNETWORK,
    subnetName: zone?.name || zone?.id || "subnet",
    name: zone?.name || zone?.id || "subnet",
    cidrBlock: zone?.cidr || "",
    availabilityZone: zone?.availability_zone || "",
    availability_zone: zone?.availability_zone || "",
    subnetType,
    subnet_type: subnetType,
    map_public_ip_on_launch: !!zone?.map_public_ip_on_launch,
    route_table: zone?.route_table || aws?.route_table || (subnetType === "public" ? "public" : "private"),
    provider_overrides: zone?.provider_overrides || {},
  };
}

function buildWorkloadData(workload) {
  const aws = workload?.provider_overrides?.aws || {};

  return {
    label: `instance-${workload?.id || workload?.name || "vm"}`,
    title: TITLE_SERVER,
    name: workload?.name || workload?.id || "vm",
    ipAddress: workload?.private_ip || "",
    ip_address: workload?.private_ip || "",
    ami: workload?.image || aws?.ami || "",
    instanceType: workload?.size || aws?.instance_type || "t2.micro",
    instance_type: workload?.size || aws?.instance_type || "t2.micro",
    sshAccess: workload?.access?.ssh_key || aws?.ssh_access || "",
    ssh_access: workload?.access?.ssh_key || aws?.ssh_access || "",
    associatePublicIp: !!(workload?.access?.public_ip ?? aws?.associate_public_ip),
    associate_public_ip: !!(workload?.access?.public_ip ?? aws?.associate_public_ip),
    provider_overrides: workload?.provider_overrides || {},
  };
}

export function topologyToCanvasFlow(topology, options = {}) {
  const provider = options.provider || "aws";
  const network = topology?.network || {};
  const segments = Array.isArray(topology?.segments) ? topology.segments : [];

  const nodes = [];
  const edges = [];

  let vpcOffsetX = 80;
  segments.forEach((segment, segmentIndex) => {
    const zones = Array.isArray(segment?.zones) ? segment.zones : [];
    const subnetHeights = zones.map((zone) => {
      const workloadCount = Array.isArray(zone?.workloads) ? zone.workloads.length : 0;
      return Math.max(heightDefaultSubNetworkNode, 110 + workloadCount * (heightDefaultInstanceNode + 12));
    });
    const vpcHeight =
      zones.length > 0
        ? Math.max(
            heightDefaultVPCNode,
            160 + subnetHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, zones.length - 1) * 24,
          )
        : heightDefaultVPCNode;
    const vpcId = segment?.id || `vpc-${segmentIndex + 1}`;

    nodes.push({
      id: vpcId,
      type: TYPE_VPC_NODE,
      position: { x: vpcOffsetX, y: 80 },
      width: widthDefaultVPCNode,
      height: vpcHeight,
      data: buildVpcData(segment, provider, network?.region),
    });

    let subnetY = 140;
    zones.forEach((zone, zoneIndex) => {
      const subnetId = zone?.id || zone?.name || `${vpcId}-subnet-${zoneIndex + 1}`;
      const subnetHeight = subnetHeights[zoneIndex];

      nodes.push({
        id: subnetId,
        type: TYPE_SUBNETWORK_NODE,
        parentId: vpcId,
        parentNode: vpcId,
        extent: "parent",
        position: { x: 24, y: subnetY },
        width: widthDefaultSubNetworkNode,
        height: subnetHeight,
        data: buildSubnetData(zone),
      });

      edges.push({
        id: `e-${vpcId}-${subnetId}`,
        source: vpcId,
        target: subnetId,
      });

      const workloads = Array.isArray(zone?.workloads) ? zone.workloads : [];
      let workloadY = 126;
      workloads.forEach((workload, workloadIndex) => {
        const workloadId = workload?.id || `${subnetId}-vm-${workloadIndex + 1}`;
        nodes.push({
          id: workloadId,
          type: TYPE_SERVER_NODE,
          parentId: subnetId,
          parentNode: subnetId,
          extent: "parent",
          position: { x: 16, y: workloadY },
          width: widthDefaultInstanceNode,
          height: heightDefaultInstanceNode,
          data: buildWorkloadData(workload),
        });

        edges.push({
          id: `e-${subnetId}-${workloadId}`,
          source: subnetId,
          target: workloadId,
        });

        workloadY += heightDefaultInstanceNode + 12;
      });

      subnetY += subnetHeight + 24;
    });

    vpcOffsetX += widthDefaultVPCNode + 96;
  });

  return {
    nodes,
    edges,
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.8,
    },
    meta: {
      generated_from: "intent-plugin",
      provider,
      network_name: network?.name || "",
      network_cidr: network?.cidr || "",
      region: network?.region || "",
    },
  };
}

export function summarizeIntentTopology(topology, options = {}) {
  const provider = options.provider || "aws";
  const network = topology?.network || {};
  const segments = Array.isArray(topology?.segments) ? topology.segments : [];

  let publicSubnets = 0;
  let privateSubnets = 0;
  let totalWorkloads = 0;
  let natGateways = 0;
  let internetGateways = 0;

  segments.forEach((segment) => {
    const aws = segment?.provider_overrides?.aws || {};
    if (aws?.internet_gateway) internetGateways += 1;
    if (aws?.nat_gateway?.enabled) natGateways += 1;

    const zones = Array.isArray(segment?.zones) ? segment.zones : [];
    zones.forEach((zone) => {
      const subnetType = String(zone?.kind || zone?.provider_overrides?.aws?.subnet_type || "").toLowerCase();
      if (subnetType === "public") publicSubnets += 1;
      else privateSubnets += 1;

      const workloads = Array.isArray(zone?.workloads) ? zone.workloads : [];
      totalWorkloads += workloads.length;
    });
  });

  return {
    provider,
    networkName: network?.name || "",
    region: network?.region || "",
    cidr: network?.cidr || "",
    segments: segments.length,
    publicSubnets,
    privateSubnets,
    workloads: totalWorkloads,
    natGateways,
    internetGateways,
  };
}

export { parseCidrParts };
