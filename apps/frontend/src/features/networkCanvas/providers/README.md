# Provider Catalog Guide / Guia del Catalogo de Providers

This folder contains the frontend entry point for cloud-provider behavior in the network canvas.

Esta carpeta contiene el punto de entrada frontend para el comportamiento de providers cloud dentro del canvas de red.

## Main file / Archivo principal

- [providerCatalog.js](./providerCatalog.js)

## How to read it / Como leerlo

### English

1. Open `providerCatalog.js`.
2. Review the factory helpers near the top:
   - `createSegmentForm`
   - `createSubnetForm`
   - `createInstanceForm`
   - `createRouterForm`
   - `createLabForm`
3. Then inspect one provider entry inside `PROVIDER_UI_CATALOG` such as `aws` or `gcp`.
4. Finally, see how forms consume the catalog:
   - `../forms/VPCNodeForm.jsx`
   - `../forms/SubNetworkNodeForm.jsx`
   - `../forms/InstanceNodeForm.jsx`
   - `../forms/RouterNodeForm.jsx`

### Espanol

1. Abre `providerCatalog.js`.
2. Revisa los helpers de fabrica que estan al inicio:
   - `createSegmentForm`
   - `createSubnetForm`
   - `createInstanceForm`
   - `createRouterForm`
   - `createLabForm`
3. Luego inspecciona una entrada dentro de `PROVIDER_UI_CATALOG`, por ejemplo `aws` o `gcp`.
4. Finalmente, revisa como los formularios consumen el catalogo:
   - `../forms/VPCNodeForm.jsx`
   - `../forms/SubNetworkNodeForm.jsx`
   - `../forms/InstanceNodeForm.jsx`
   - `../forms/RouterNodeForm.jsx`

## What belongs in the catalog / Que pertenece al catalogo

### English

- Provider labels and region options
- Form field behavior by provider
- Provider-specific wording shown in the UI
- Provider-specific payload translations through `form.providerOverrides`
- Lab creation behavior through `lab.form`

Current examples:
- GCP adds a lab-level `project ID` field through `lab.form.fields`
- GCP adds a lab-level `project profile` select through `lab.form.fields`
- Azure adds a lab-level `subscription alias` field through `lab.form.fields`
- Azure adds a lab-level `subscription context` select through `lab.form.fields`

### Espanol

- Labels del provider y opciones de region
- Comportamiento de campos de formulario por provider
- Textos especificos del provider que se muestran en la UI
- Traducciones especificas del payload a traves de `form.providerOverrides`
- Comportamiento del formulario de creacion del laboratorio a traves de `lab.form`

Ejemplos actuales:
- GCP agrega un campo de laboratorio `project ID` mediante `lab.form.fields`
- GCP agrega un `select` de `perfil de proyecto` mediante `lab.form.fields`
- Azure agrega un campo de laboratorio `alias de suscripcion` mediante `lab.form.fields`
- Azure agrega un `select` de `contexto de suscripcion` mediante `lab.form.fields`

## Recommended flow to add a new provider / Flujo recomendado para agregar un nuevo provider

### English

1. Copy the provider entry that most closely resembles the new cloud.
2. Adjust `label`, `lab.regionOptions`, and `executionTargetDescriptor`.
3. Define `segment.form`, `subnet.form`, `instance.form`, `router.form`, and `lab.form`.
4. Add or reuse i18n keys if the provider needs different wording.
5. Test the canvas forms for:
   - VPC/network creation
   - subnet creation
   - instance creation
   - router/connectivity editing

### Espanol

1. Copia la entrada del provider que mas se parezca al nuevo cloud.
2. Ajusta `label`, `lab.regionOptions` y `executionTargetDescriptor`.
3. Define `segment.form`, `subnet.form`, `instance.form`, `router.form` y `lab.form`.
4. Agrega o reutiliza claves i18n si el provider necesita textos diferentes.
5. Prueba los formularios del canvas para:
   - creacion de VPC/red
   - creacion de subnet
   - creacion de instancia
   - edicion de router/conectividad

## Copy-paste template for a new provider / Plantilla para copiar y pegar un nuevo provider

### English

Use the closest provider as a base.

- If the cloud behaves like AWS in network modeling, start from `aws`.
- If the cloud behaves more like GCP in runtime or subnet semantics, start from `gcp`.

### Espanol

Usa como base el provider mas parecido.

- Si el cloud se comporta mas como AWS en el modelado de red, parte desde `aws`.
- Si el cloud se comporta mas como GCP en runtime o semantica de subnets, parte desde `gcp`.

Example skeleton / Ejemplo de esqueleto:

```js
["oci"]: {
  provider: "oci",
  label: "Oracle Cloud",
  designEnabled: true,
  defaultRuntimeStatus: "planned",
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
    kindLabel: "VCN",
    managedEgressLabel: "NAT Gateway",
    internetEdgeLabel: "Internet Gateway",
    natRequiresPublicZone: true,
    supportsElasticIp: false,
    allowedIngressLabel: "SSH source ranges",
    form: createSegmentForm({
      internetGatewayField: {
        control: "boolean-select",
        labelKey: "canvas.vpcForm.fields.internetEdge",
        options: [
          { value: true, labelKey: "canvas.vpcForm.fields.enabled" },
          { value: false, labelKey: "canvas.vpcForm.fields.disabled" },
        ],
        defaultValue: false,
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
        { source: "$literal", target: "resource_kind", value: "vcn" },
        { source: "internetGateway", target: "internet_gateway", transform: "boolean" },
        { source: "enableNatGateway", target: "nat_gateway.enabled", transform: "boolean" },
        { source: "allowedSshCidr", target: "security.ssh_source_ranges", transform: "arrayIfValue" },
      ],
      chips: {
        internetEnabledKey: "canvas.vpcForm.chips.igwEnabled",
        internetDisabledKey: "canvas.vpcForm.chips.igwDisabled",
      },
      infoSummaryTailKey: "canvas.vpcForm.info.providerInternetModel",
    }),
  },
  subnet: {
    kindLabel: "Subnet",
    form: createSubnetForm({
      availabilityScope: "region",
      toggleFields: [
        {
          name: "flowLogs",
          control: "checkbox",
          labelKey: "canvas.subnetForm.gcpFields.flowLogs",
        },
      ],
      providerOverrides: [
        { source: "subnetType", target: "subnet_type" },
        { source: "flowLogs", target: "flow_logs", transform: "boolean" },
      ],
    }),
  },
  instance: {
    imageLabel: "Image",
    instanceTypeLabel: "Shape",
    instanceTypeOptions: [
      { value: "VM.Standard.E2.1.Micro", label: "VM.Standard.E2.1.Micro" },
    ],
    sshFieldLabel: "SSH username",
    publicIpLabel: "Assign public IP",
    form: createInstanceForm({
      runtimeHelperMode: "provider",
      imageField: {
        control: "text",
        placeholder: "Oracle-Linux-9",
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
        placeholder: "opc",
      },
      providerOverrides: [
        { source: "instanceType", target: "shape" },
        { source: "ami", target: "image" },
        { source: "associatePublicIp", target: "public_ip", transform: "boolean" },
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
    directLabel: "VCN Peering",
    hubLabel: "DRG Hub",
    form: createRouterForm(),
  },
  lab: {
    defaultRegion: "us-ashburn-1",
    regionOptions: [
      { value: "us-ashburn-1", label: "US East (Ashburn)" },
      { value: "sa-santiago-1", label: "South America (Santiago)" },
    ],
    executionTargetDescriptor: "OCI tenancy + credentials",
    form: createLabForm({
      executionBindingMode: "planned",
      fields: [
        {
          name: "compartmentName",
          control: "text",
          labelKey: "canvas.form.cloudProvider",
          placeholder: "sandbox-networking",
        },
      ],
      providerOverrides: [
        { source: "compartmentName", target: "compartment_name", transform: "trim" },
      ],
    }),
  },
}
```

## Practical checklist for that template / Checklist practico para esa plantilla

### English

1. Replace the provider key, label, and region list.
2. Rename cloud concepts:
   - `kindLabel`
   - `managedEgressLabel`
   - `internetEdgeLabel`
   - `directLabel`
   - `hubLabel`
3. Adjust `providerOverrides` so the payload uses the backend names expected by that provider.
4. Reuse existing i18n keys first.
5. Only create new i18n keys if the provider needs genuinely different wording.
6. If the provider needs a new UI control, add support in the form renderer after confirming the catalog cannot already express it.

### Espanol

1. Reemplaza la clave del provider, el label y la lista de regiones.
2. Renombra los conceptos cloud:
   - `kindLabel`
   - `managedEgressLabel`
   - `internetEdgeLabel`
   - `directLabel`
   - `hubLabel`
3. Ajusta `providerOverrides` para que el payload use los nombres backend esperados por ese provider.
4. Reutiliza primero las claves i18n existentes.
5. Solo crea nuevas claves i18n si el provider realmente necesita textos diferentes.
6. Si el provider necesita un control UI nuevo, agrega soporte en el renderer del formulario solo despues de confirmar que el catalogo no puede expresarlo ya.

## Recommended flow to add a new provider-specific field / Flujo recomendado para agregar un campo especifico de provider

### English

1. Find the correct section in the provider entry:
   - `segment.form.fields`
   - `subnet.form.toggleFields`
   - `instance.form.imageField`
   - `instance.form.imageProjectField`
   - `instance.form.sshField`
2. If the field affects backend payload translation, add a rule to `form.providerOverrides`.
3. Only change JSX when the field requires a brand-new control type not already supported.

### Espanol

1. Encuentra la seccion correcta dentro de la entrada del provider:
   - `segment.form.fields`
   - `subnet.form.toggleFields`
   - `instance.form.imageField`
   - `instance.form.imageProjectField`
   - `instance.form.sshField`
2. Si el campo afecta la traduccion del payload backend, agrega una regla en `form.providerOverrides`.
3. Solo cambia JSX cuando el campo requiera un tipo de control nuevo que aun no este soportado.

## Goal of this structure / Objetivo de esta estructura

### English

The intent is that most provider work should happen by editing configuration in the catalog, not by rewriting form logic.

### Espanol

La idea es que la mayor parte del trabajo de providers ocurra editando configuracion en el catalogo, no reescribiendo la logica de los formularios.
