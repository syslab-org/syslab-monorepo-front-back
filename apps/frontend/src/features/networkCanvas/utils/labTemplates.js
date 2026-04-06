import singleVpcBastionPrivateFlow from '../../../../examples/network-scenarios/generated-canvas/02-single-vpc-public-private-nat.canvas.json';
import threeVpcsPartialPeeringFlow from '../../../../examples/network-scenarios/generated-canvas/06-three-vpcs-peering-partial.canvas.json';

export const LAB_TEMPLATES = [
  {
    value: 'mvp1-single-vpc-bastion-private',
    title: 'MVP 1 - 1 segmento (Bastion + App privada)',
    desc: 'Crea un laboratorio inicial con una VPC, una zona publica, una zona privada y dos workloads listos para continuar el modelado.',
    recommendedCidr: '10.30.0.0/16',
    flow: singleVpcBastionPrivateFlow,
  },
  {
    value: 'case3-3vpcs-router-peering',
    title: 'Caso 3 - 3 segmentos con conectividad parcial',
    desc: 'Precarga tres segmentos y un nodo de conectividad con rutas parciales para demostrar enlaces controlados entre algunos pares.',
    recommendedCidr: '10.70.0.0/14',
    flow: threeVpcsPartialPeeringFlow,
  },
];

const DEFAULT_SSH_KEY = 'tesis-key-new';

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

export const getLabTemplateByValue = (value) => LAB_TEMPLATES.find((template) => template.value === value) || null;

export const buildTemplateFlow = (value) => {
  const template = getLabTemplateByValue(value);
  if (!template?.flow) return null;

  const flow = clone(template.flow);
  flow.nodes = Array.isArray(flow.nodes)
    ? flow.nodes.map((node) => {
        if (node?.type !== 'server') return node;
        return {
          ...node,
          data: {
            ...(node.data || {}),
            sshAccess: DEFAULT_SSH_KEY,
            ssh_access: DEFAULT_SSH_KEY,
          },
        };
      })
    : [];

  flow.meta = {
    ...(flow.meta || {}),
    template_seed: value,
  };

  return flow;
};
