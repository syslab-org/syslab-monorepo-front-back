import {
  CLOUD_AWS_LABEL,
  CLOUD_AWS_VALUE,
  CLOUD_AZURE_LABEL,
  CLOUD_AZURE_VALUE,
  CLOUD_GCP_LABEL,
  CLOUD_GCP_VALUE,
} from "@/shared/constants";

import { INSTANCE_TYPE_OPTIONS as AWS_INSTANCE_TYPE_OPTIONS } from "@/features/networkCanvas/forms/options/instanceTypes";

/*
 * Provider catalog guide
 * ----------------------
 * This file is the main entry point for adding or adjusting cloud providers in the canvas.
 *
 * Suggested reading order:
 * 1. Factory helpers (`createSegmentForm`, `createSubnetForm`, `createInstanceForm`, `createRouterForm`).
 *    These define the shape that forms consume.
 * 2. The provider entries inside `PROVIDER_UI_CATALOG`.
 *    Each provider declares labels, regions, form behavior, and provider-specific overrides.
 * 3. Consumer forms (`VPCNodeForm`, `SubNetworkNodeForm`, `InstanceNodeForm`, `RouterNodeForm`).
 *    Those forms read this catalog instead of hardcoding provider branches.
 *
 * When adding a new provider, start by cloning the closest existing provider entry and then adjust:
 * - `segment`: network/VPC-like behavior
 * - `subnet`: subnet behavior and extra toggles
 * - `instance`: runtime/image/SSH behavior
 * - `router`: connectivity wording
 * - `lab`: region list and execution descriptor
 *
 * Keep provider-specific payload translations in `form.providerOverrides` whenever possible.
 */

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

const COMMON_SUBNET_INFO_LINES = [
  "canvas.subnetForm.info.parentCidr",
  "canvas.subnetForm.info.noOverlap",
  "canvas.subnetForm.info.publicVsPrivate",
];

function createRouterForm() {
  return {
    modeOptions: {
      peeringLabelKey: "canvas.routerForm.modeOptions.providerPeering",
      tgwLabelKey: "canvas.routerForm.modeOptions.providerHub",
    },
    chips: {
      directKey: "canvas.routerForm.chips.providerDirect",
      hubKey: "canvas.routerForm.chips.providerHub",
    },
    modeSummary: {
      peeringBulletKey: "canvas.routerForm.modeSummary.peering.bulletProvider",
      tgwBulletKey: "canvas.routerForm.modeSummary.tgw.bulletProvider",
    },
  };
}

// Shared shape for VPC/VNet-like forms.
function createSegmentForm({
  internetGatewayField,
  allowedSshField,
  managedEgress,
  providerOverrides,
  chips,
  infoSummaryTailKey,
  extraFields = [],
}) {
  return {
    fields: {
      internetGateway: internetGatewayField,
      allowedSshCidr: allowedSshField,
    },
    managedEgress,
    providerOverrides,
    chips,
    infoSummaryTailKey,
    extraFields,
  };
}

// Shared shape for subnet forms. Prefer `toggleFields` over top-level feature flags.
function createSubnetForm({
  availabilityScope,
  extraInfoLines = [],
  toggleFields = [],
  providerOverrides = [],
}) {
  return {
    availabilityScope,
    infoLines: COMMON_SUBNET_INFO_LINES,
    extraInfoLines,
    toggleFields,
    providerOverrides,
  };
}

// Shared shape for instance forms. Choose field controls instead of provider branches in JSX.
function createInstanceForm({
  runtimeHelperMode = "default",
  imageField,
  imageFieldHelpKey,
  imageProjectField,
  sshSection = { titleMode: "default", helperMode: "default" },
  sshField,
  sshManualField,
  providerOverrides,
  systemValidation,
}) {
  return {
    runtimeHelperMode,
    imageField,
    ...(imageFieldHelpKey ? { imageFieldHelpKey } : {}),
    ...(imageProjectField ? { imageProjectField } : {}),
    sshSection,
    sshField,
    ...(sshManualField ? { sshManualField } : {}),
    providerOverrides,
    systemValidation,
  };
}

// Shared shape for lab creation. Use this for provider-specific fields in `NewVLANForm`.
function createLabForm({
  executionBindingMode = "planned",
  wizardAlerts = [],
  fields = [],
  providerOverrides = [],
}) {
  return {
    executionBindingMode,
    wizardAlerts,
    fields,
    providerOverrides,
  };
}

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
      form: createSegmentForm({
        internetGatewayField: {
          control: "boolean-select",
          mode: "select",
          labelKey: "canvas.vpcForm.fields.internetEdge",
          options: [
            { value: true, labelKey: "canvas.vpcForm.fields.enabled" },
            { value: false, labelKey: "canvas.vpcForm.fields.disabled" },
          ],
          defaultValue: false,
        },
        allowedSshField: {
          control: "text",
          labelKey: "canvas.vpcForm.fields.allowedSsh",
          helpKey: "canvas.vpcForm.fields.allowedSshHelp",
          placeholderKey: "canvas.vpcForm.fields.allowedSshPlaceholder",
        },
        managedEgress: {
          labelKey: "canvas.vpcForm.switchLabel",
          demoCaseKey: "canvas.vpcForm.alerts.demoCase",
          natEnabledKey: "canvas.vpcForm.chips.natEnabled",
          natDisabledKey: "canvas.vpcForm.chips.natDisabled",
        },
        providerOverrides: [
          { source: "$literal", target: "resource_kind", value: "vpc" },
          {
            source: "internetGateway",
            target: "internet_gateway",
            transform: "boolean",
          },
          {
            source: "enableNatGateway",
            target: "nat_gateway.enabled",
            transform: "boolean",
          },
          {
            source: "natGatewayPublicSubnet",
            target: "nat_gateway.public_subnet",
          },
          {
            source: "natGatewayElasticIp",
            target: "nat_gateway.elastic_ip",
            transform: "trim",
          },
        ],
        chips: {
          internetEnabledKey: "canvas.vpcForm.chips.igwEnabled",
          internetDisabledKey: "canvas.vpcForm.chips.igwDisabled",
        },
        infoSummaryTailKey: "canvas.vpcForm.info.elasticIp",
      }),
    },
    subnet: {
      kindLabel: "Subnet",
      form: createSubnetForm({
        availabilityScope: "zone",
        toggleFields: [
          {
            name: "map_public_ip_on_launch",
            control: "checkbox",
            labelKey: "canvas.subnetForm.fields.autoAssignPublicIp",
            disableWhenSubnetType: "private",
            errorField: "map_public_ip_on_launch",
          },
        ],
        providerOverrides: [
          { source: "subnetType", target: "subnet_type" },
          { source: "$literal", target: "route_table", value: "main" },
        ],
      }),
    },
    instance: {
      imageLabel: "AMI",
      instanceTypeLabel: "Instance type",
      instanceTypeOptions: AWS_INSTANCE_TYPE_OPTIONS,
      sshFieldLabel: "SSH access (key pair)",
      publicIpLabel: "Associate public IP",
      form: createInstanceForm({
        imageField: {
          control: "catalog-select",
          emptyOptionKey: "canvas.instanceForm.fields.useDefaultAmi",
          fallbackHelpKey: "canvas.instanceForm.fields.amiFallback",
        },
        sshField: {
          control: "catalog-autocomplete",
        },
        providerOverrides: [
          { source: "instanceType", target: "instance_type" },
          { source: "ami", target: "ami" },
          {
            source: "associatePublicIp",
            target: "associate_public_ip",
            transform: "boolean",
          },
          { source: "sshAccess", target: "ssh_access" },
        ],
        systemValidation: {
          deployKey: "canvas.instanceForm.systemValidation.deploy",
          sshKey: "canvas.instanceForm.systemValidation.ssh",
        },
      }),
    },
    router: {
      directLabel: "VPC Peering",
      hubLabel: "Transit Gateway",
      form: createRouterForm(),
    },
    lab: {
      defaultRegion: "us-east-1",
      regionOptions: AWS_REGION_OPTIONS,
      executionTargetDescriptor: "AWS cloud connection",
      form: createLabForm({
        executionBindingMode: "cloud_connection",
        wizardAlerts: [
          {
            severity: "info",
            textKey: "canvas.form.awsOnlyInfo",
          },
        ],
      }),
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
      form: createSegmentForm({
        internetGatewayField: {
          control: "alert",
          mode: "info",
          severity: "info",
          textKey: "canvas.vpcForm.gcpInternetHint",
        },
        allowedSshField: {
          control: "text",
          labelKey: "canvas.vpcForm.gcpFields.allowedSsh",
          helpKey: "canvas.vpcForm.gcpFields.allowedSshHelp",
          placeholderKey: "canvas.vpcForm.gcpFields.allowedSshPlaceholder",
        },
        managedEgress: {
          labelKey: "canvas.vpcForm.gcpSwitchLabel",
          demoCaseKey: "canvas.vpcForm.gcpAlerts.demoCase",
          natEnabledKey: "canvas.vpcForm.gcpChips.natEnabled",
          natDisabledKey: "canvas.vpcForm.gcpChips.natDisabled",
        },
        providerOverrides: [
          { source: "$literal", target: "resource_kind", value: "vpc_network" },
          {
            source: "enableNatGateway",
            target: "cloud_nat.enabled",
            transform: "boolean",
          },
          {
            source: "allowedSshCidr",
            target: "firewall.ssh_source_ranges",
            transform: "arrayIfValue",
          },
        ],
        chips: {
          internetModelKey: "canvas.vpcForm.gcpChips.internetModel",
        },
        infoSummaryTailKey: "canvas.vpcForm.info.providerInternetModel",
      }),
    },
    subnet: {
      kindLabel: "Regional subnet",
      form: createSubnetForm({
        availabilityScope: "region",
        extraInfoLines: [
          "canvas.subnetForm.gcpInfo.regional",
          "canvas.subnetForm.gcpInfo.externalIp",
        ],
        toggleFields: [
          {
            name: "privateGoogleAccess",
            control: "checkbox",
            labelKey: "canvas.subnetForm.gcpFields.privateGoogleAccess",
          },
          {
            name: "flowLogs",
            control: "checkbox",
            labelKey: "canvas.subnetForm.gcpFields.flowLogs",
          },
        ],
        providerOverrides: [
          { source: "subnetType", target: "subnet_type" },
          {
            source: "privateGoogleAccess",
            target: "private_google_access",
            transform: "boolean",
          },
          { source: "flowLogs", target: "flow_logs", transform: "boolean" },
          { source: "$effectiveRegion", target: "region" },
        ],
      }),
    },
    instance: {
      imageLabel: "Image family",
      instanceTypeLabel: "Machine type",
      instanceTypeOptions: GCP_MACHINE_TYPE_OPTIONS,
      sshFieldLabel: "SSH username",
      publicIpLabel: "Assign external IP",
      form: createInstanceForm({
        runtimeHelperMode: "provider",
        imageField: {
          control: "text",
          placeholder: "debian-12",
        },
        imageFieldHelpKey: "canvas.instanceForm.gcpFields.imageFamilyHelp",
        imageProjectField: {
          labelKey: "canvas.instanceForm.gcpFields.imageProject",
          helpKey: "canvas.instanceForm.gcpFields.imageProjectHelp",
          placeholder: "debian-cloud",
        },
        sshSection: {
          titleMode: "provider",
          helperMode: "provider",
        },
        sshField: {
          control: "text",
        },
        sshManualField: {
          labelKey: "canvas.instanceForm.gcpFields.sshUser",
          helpKey: "canvas.instanceForm.gcpFields.sshUserHelp",
          placeholder: "syslab",
          alertKey: "canvas.instanceForm.gcpFields.metadataHint",
        },
        providerOverrides: [
          { source: "instanceType", target: "machine_type" },
          { source: "ami", target: "image_family" },
          { source: "gcpImageProject", target: "image_project" },
          {
            source: "associatePublicIp",
            target: "external_ip",
            transform: "boolean",
          },
          { source: "sshAccess", target: "ssh_user" },
        ],
        systemValidation: {
          deployKey: "canvas.instanceForm.systemValidation.deployProvider",
          sshKey: "canvas.instanceForm.systemValidation.sshProvider",
          interpolateProvider: true,
        },
      }),
    },
    router: {
      directLabel: "VPC Peering",
      hubLabel: "Cloud Router Hub",
      form: createRouterForm(),
    },
    lab: {
      defaultRegion: "us-central1",
      regionOptions: GCP_REGION_OPTIONS,
      executionTargetDescriptor: "GCP project + service account",
      form: createLabForm({
        executionBindingMode: "planned",
        fields: [
          {
            name: "gcpProjectProfile",
            control: "select",
            labelKey: "canvas.form.providerFields.gcpProjectProfile",
            helpKey: "canvas.form.providerFields.gcpProjectProfileHelp",
            defaultValue: "sandbox",
            options: [
              {
                value: "sandbox",
                labelKey: "canvas.form.providerFields.options.gcpSandbox",
              },
              {
                value: "shared-lab",
                labelKey: "canvas.form.providerFields.options.gcpSharedLab",
              },
              {
                value: "production-like",
                labelKey: "canvas.form.providerFields.options.gcpProductionLike",
              },
            ],
          },
          {
            name: "gcpProjectId",
            control: "text",
            labelKey: "canvas.form.providerFields.gcpProjectId",
            helpKey: "canvas.form.providerFields.gcpProjectIdHelp",
            placeholderKey:
              "canvas.form.providerFields.gcpProjectIdPlaceholder",
          },
        ],
        providerOverrides: [
          { source: "gcpProjectProfile", target: "project_profile" },
          { source: "gcpProjectId", target: "project_id", transform: "trim" },
        ],
      }),
    },
  },
  [CLOUD_AZURE_VALUE]: {
    provider: CLOUD_AZURE_VALUE,
    label: CLOUD_AZURE_LABEL,
    designEnabled: true,
    defaultRuntimeStatus: "planned",
    runtimeFeatures: {},
    segment: {
      kindLabel: "VNet",
      managedEgressLabel: "NAT Gateway",
      internetEdgeLabel: "Internet Edge",
      natRequiresPublicZone: false,
      supportsElasticIp: false,
      allowedIngressLabel: "SSH source ranges",
      form: createSegmentForm({
        internetGatewayField: {
          control: "alert",
          mode: "info",
          severity: "info",
          textKey: "canvas.vpcForm.gcpInternetHint",
        },
        allowedSshField: {
          control: "text",
          labelKey: "canvas.vpcForm.gcpFields.allowedSsh",
          helpKey: "canvas.vpcForm.gcpFields.allowedSshHelp",
          placeholderKey: "canvas.vpcForm.gcpFields.allowedSshPlaceholder",
        },
        managedEgress: {
          labelKey: "canvas.vpcForm.gcpSwitchLabel",
          demoCaseKey: "canvas.vpcForm.gcpAlerts.demoCase",
          natEnabledKey: "canvas.vpcForm.gcpChips.natEnabled",
          natDisabledKey: "canvas.vpcForm.gcpChips.natDisabled",
        },
        providerOverrides: [
          { source: "$literal", target: "resource_kind", value: "vnet" },
          {
            source: "enableNatGateway",
            target: "nat_gateway.enabled",
            transform: "boolean",
          },
          {
            source: "allowedSshCidr",
            target: "firewall.ssh_source_ranges",
            transform: "arrayIfValue",
          },
        ],
        chips: {
          internetModelKey: "canvas.vpcForm.gcpChips.internetModel",
        },
        infoSummaryTailKey: "canvas.vpcForm.info.providerInternetModel",
      }),
    },
    subnet: {
      kindLabel: "Subnet",
      form: createSubnetForm({
        availabilityScope: "region",
        providerOverrides: [{ source: "subnetType", target: "subnet_type" }],
      }),
    },
    instance: {
      imageLabel: "Image",
      instanceTypeLabel: "VM size",
      instanceTypeOptions: [],
      sshFieldLabel: "SSH user",
      publicIpLabel: "Assign public IP",
      form: createInstanceForm({
        runtimeHelperMode: "provider",
        imageField: {
          control: "text",
          placeholder: "ubuntu-22.04",
        },
        sshField: {
          control: "text",
        },
        sshManualField: {
          labelKey: "canvas.instanceForm.gcpFields.sshUser",
          helpKey: "canvas.instanceForm.gcpFields.sshUserHelp",
          placeholder: "syslab",
          alertKey: "canvas.instanceForm.gcpFields.metadataHint",
        },
        providerOverrides: [
          { source: "instanceType", target: "vm_size" },
          { source: "ami", target: "image" },
          {
            source: "associatePublicIp",
            target: "public_ip",
            transform: "boolean",
          },
          { source: "sshAccess", target: "ssh_user" },
        ],
        systemValidation: {
          deployKey: "canvas.instanceForm.systemValidation.deployProvider",
          sshKey: "canvas.instanceForm.systemValidation.sshProvider",
          interpolateProvider: true,
        },
      }),
    },
    router: {
      directLabel: "VNet Peering",
      hubLabel: "Hub Routing",
      form: createRouterForm(),
    },
    lab: {
      defaultRegion: "eastus",
      regionOptions: AZURE_REGION_OPTIONS,
      executionTargetDescriptor: "Azure subscription + service principal",
      form: createLabForm({
        executionBindingMode: "planned",
        fields: [
          {
            name: "azureLandingZone",
            control: "select",
            labelKey: "canvas.form.providerFields.azureLandingZone",
            helpKey: "canvas.form.providerFields.azureLandingZoneHelp",
            defaultValue: "student-subscription",
            options: [
              {
                value: "student-subscription",
                labelKey: "canvas.form.providerFields.options.azureStudentSubscription",
              },
              {
                value: "shared-course-subscription",
                labelKey: "canvas.form.providerFields.options.azureSharedCourseSubscription",
              },
              {
                value: "network-sandbox",
                labelKey: "canvas.form.providerFields.options.azureNetworkSandbox",
              },
            ],
          },
          {
            name: "azureSubscriptionAlias",
            control: "text",
            labelKey: "canvas.form.providerFields.azureSubscriptionAlias",
            helpKey: "canvas.form.providerFields.azureSubscriptionAliasHelp",
            placeholderKey:
              "canvas.form.providerFields.azureSubscriptionAliasPlaceholder",
          },
        ],
        providerOverrides: [
          { source: "azureLandingZone", target: "landing_zone" },
          {
            source: "azureSubscriptionAlias",
            target: "subscription_alias",
            transform: "trim",
          },
        ],
      }),
    },
  },
};

export function getCanvasProviderDefinition(provider) {
  const key =
    String(provider || CLOUD_AWS_VALUE)
      .trim()
      .toLowerCase() || CLOUD_AWS_VALUE;
  return PROVIDER_UI_CATALOG[key] || PROVIDER_UI_CATALOG[CLOUD_AWS_VALUE];
}

export function getCanvasProviderLabel(provider) {
  return getCanvasProviderDefinition(provider).label;
}

export function buildCanvasProviderOptions(runtimeCapabilities = []) {
  const capabilityMap = {};

  (Array.isArray(runtimeCapabilities) ? runtimeCapabilities : []).forEach(
    (item) => {
      const provider = String(item?.provider || "")
        .trim()
        .toLowerCase();
      if (!provider) return;
      capabilityMap[provider] = {
        status: item?.status || "unknown",
        features: item?.features || {},
      };
    },
  );

  const providerKeys = Array.from(
    new Set([
      ...Object.keys(PROVIDER_UI_CATALOG),
      ...Object.keys(capabilityMap),
    ]),
  );

  return providerKeys.map((provider) => {
    const definition = getCanvasProviderDefinition(provider);
    const runtime = capabilityMap[provider] || null;
    return {
      provider,
      label: definition.label,
      designEnabled: definition.designEnabled !== false,
      runtimeStatus:
        runtime?.status || definition.defaultRuntimeStatus || "unknown",
      features: runtime?.features || definition.runtimeFeatures || {},
    };
  });
}
