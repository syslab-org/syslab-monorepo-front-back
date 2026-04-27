// apps/frontend/src/config/networking.js
export const RouterPolicy = {
  defaultMode: "peering",

  // máximo de VPCs conectadas para usar peering
  peeringMaxVpcs: 2,

  // precios estimados de AWS (para el warning)
  pricing: {
    tgwHourly: 0.05,            // USD/hora por TGW
    tgwAttachmentHourly: 0.05,  // USD/hora por cada VPC adjunta
    tgwPerGb: 0.02              // USD/GB de tráfico
  }
}
