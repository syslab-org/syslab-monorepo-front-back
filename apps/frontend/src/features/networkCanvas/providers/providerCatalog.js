import {
  CLOUD_AWS_LABEL,
  CLOUD_AWS_VALUE,
  CLOUD_AZURE_LABEL,
  CLOUD_AZURE_VALUE,
  CLOUD_GCP_LABEL,
  CLOUD_GCP_VALUE,
} from "@/shared/constants";

import { INSTANCE_TYPE_OPTIONS as AWS_INSTANCE_TYPE_OPTIONS } from "@/features/networkCanvas/forms/options/instanceTypes";

const GCP_MACHINE_TYPE_OPTIONS = [
  { value: "e2-micro", label: "e2-micro" },
  { value: "e2-small", label: "e2-small" },
  { value: "e2-medium", label: "e2-medium" },
  { value: "e2-standard-2", label: "e2-standard-2" },
  { value: "n2-standard-2", label: "n2-standard-2" },
];

const AWS_REGION_OPTIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "EU (Ireland)" },
];

const GCP_REGION_OPTIONS = [
  { value: "us-central1", label: "Iowa (us-central1)" },
  { value: "us-east1", label: "South Carolina (us-east1)" },
  { value: "southamerica-west1", label: "Santiago (southamerica-west1)" },
];

const AZURE_REGION_OPTIONS = [
  { value: "eastus", label: "East US (eastus)" },
  { value: "westus2", label: "West US 2 (westus2)" },
  { value: "westeurope", label: "West Europe (westeurope)" },
];

const PROVIDER_UI_CATALOG = {
  [CLOUD_AWS_VALUE]: {
    provider: CLOUD_AWS_VALUE,
    label: CLOUD_AWS_LABEL,
    designEnabled: true,
    defaultRuntimeStatus: "ready",
    runtimeFeatures: {
      network_segments: true,
      subnets: true,
      instances: true,
      nat_gateway: true,
      internet_gateway: true,
      direct_connectivity: true,
      hub_connectivity: true,
    },
    segment: {
      kindLabel: "VPC",
      managedEgressLabel: "NAT Gateway",
      internetEdgeLabel: "Internet Gateway",
      natRequiresPublicZone: true,
      supportsElasticIp: true,
      allowedIngressLabel: "Allowed SSH CIDR",
    },
    subnet: {
      kindLabel: "Subnet",
      showAvailabilityZone: true,
      showZoneType: true,
      showAutoAssignPublicIp: true,
      showPrivateGoogleAccess: false,
      showFlowLogs: false,
    },
    instance: {
      imageMode: "catalog_ami",
      imageLabel: "AMI",
      imageProjectLabel: "",
      imageFallbackLabel: "Use default AMI",
      instanceTypeLabel: "Instance type",
      instanceTypeOptions: AWS_INSTANCE_TYPE_OPTIONS,
      sshMode: "key_pair",
      sshFieldLabel: "SSH access (key pair)",
      sshCatalogEnabled: true,
      publicIpLabel: "Associate public IP",
    },
    router: {
      directLabel: "VPC Peering",
      hubLabel: "Transit Gateway",
    },
    lab: {
      defaultRegion: "us-east-1",
      regionOptions: AWS_REGION_OPTIONS,
      executionTargetDescriptor: "AWS cloud connection",
    },
  },
  [CLOUD_GCP_VALUE]: {
    provider: CLOUD_GCP_VALUE,
    label: CLOUD_GCP_LABEL,
    designEnabled: true,
    defaultRuntimeStatus: "planned",
    runtimeFeatures: {
      network_segments: true,
      subnets: true,
      instances: true,
      nat_gateway: true,
      internet_gateway: false,
      direct_connectivity: true,
      hub_connectivity: true,
    },
    segment: {
      kindLabel: "VPC Network",
      managedEgressLabel: "Cloud NAT",
      internetEdgeLabel: "Default Internet Access",
      natRequiresPublicZone: false,
      supportsElasticIp: false,
      allowedIngressLabel: "SSH source ranges",
    },
    subnet: {
      kindLabel: "Regional subnet",
      showAvailabilityZone: false,
      showZoneType: true,
      showAutoAssignPublicIp: false,
      showPrivateGoogleAccess: true,
      showFlowLogs: true,
    },
    instance: {
      imageMode: "family_project",
      imageLabel: "Image family",
      imageProjectLabel: "Image project",
      imageFallbackLabel: "Use common Linux family",
      instanceTypeLabel: "Machine type",
      instanceTypeOptions: GCP_MACHINE_TYPE_OPTIONS,
      sshMode: "metadata",
      sshFieldLabel: "SSH username",
      sshCatalogEnabled: false,
      publicIpLabel: "Assign external IP",
    },
    router: {
      directLabel: "VPC Peering",
      hubLabel: "Cloud Router Hub",
    },
    lab: {
      defaultRegion: "us-central1",
      regionOptions: GCP_REGION_OPTIONS,
      executionTargetDescriptor: "GCP project + service account",
    },
  },
  [CLOUD_AZURE_VALUE]: {
    provider: CLOUD_AZURE_VALUE,
    label: CLOUD_AZURE_LABEL,
    designEnabled: false,
    defaultRuntimeStatus: "planned",
    runtimeFeatures: {},
    segment: {
      kindLabel: "VNet",
      managedEgressLabel: "NAT Gateway",
      internetEdgeLabel: "Internet Edge",
      natRequiresPublicZone: false,
      supportsElasticIp: false,
      allowedIngressLabel: "SSH source ranges",
    },
    subnet: {
      kindLabel: "Subnet",
      showAvailabilityZone: false,
      showZoneType: true,
      showAutoAssignPublicIp: false,
      showPrivateGoogleAccess: false,
      showFlowLogs: false,
    },
    instance: {
      imageMode: "manual",
      imageLabel: "Image",
      imageProjectLabel: "",
      imageFallbackLabel: "Use default image",
      instanceTypeLabel: "VM size",
      instanceTypeOptions: [],
      sshMode: "manual",
      sshFieldLabel: "SSH user",
      sshCatalogEnabled: false,
      publicIpLabel: "Assign public IP",
    },
    router: {
      directLabel: "VNet Peering",
      hubLabel: "Hub Routing",
    },
    lab: {
      defaultRegion: "eastus",
      regionOptions: AZURE_REGION_OPTIONS,
      executionTargetDescriptor: "Azure subscription + service principal",
    },
  },
};

export function getCanvasProviderDefinition(provider) {
  const key = String(provider || CLOUD_AWS_VALUE).trim().toLowerCase() || CLOUD_AWS_VALUE;
  return PROVIDER_UI_CATALOG[key] || PROVIDER_UI_CATALOG[CLOUD_AWS_VALUE];
}

export function getCanvasProviderLabel(provider) {
  return getCanvasProviderDefinition(provider).label;
}

export function buildCanvasProviderOptions(runtimeCapabilities = []) {
  const capabilityMap = {};

  (Array.isArray(runtimeCapabilities) ? runtimeCapabilities : []).forEach((item) => {
    const provider = String(item?.provider || "").trim().toLowerCase();
    if (!provider) return;
    capabilityMap[provider] = {
      status: item?.status || "unknown",
      features: item?.features || {},
    };
  });

  const providerKeys = Array.from(
    new Set([...Object.keys(PROVIDER_UI_CATALOG), ...Object.keys(capabilityMap)]),
  );

  return providerKeys.map((provider) => {
    const definition = getCanvasProviderDefinition(provider);
    const runtime = capabilityMap[provider] || null;
    return {
      provider,
      label: definition.label,
      designEnabled: definition.designEnabled !== false,
      runtimeStatus: runtime?.status || definition.defaultRuntimeStatus || "unknown",
      features: runtime?.features || definition.runtimeFeatures || {},
    };
  });
}
