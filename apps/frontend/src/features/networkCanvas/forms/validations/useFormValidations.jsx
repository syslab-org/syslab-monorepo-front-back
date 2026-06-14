import { Netmask } from 'netmask';
import * as yup from 'yup';
import {
  TYPE_COMPUTER_NODE,
  TYPE_INSTANCE_NODE,
  TYPE_PRINTER_NODE,
  TYPE_ROUTER_NODE,
  TYPE_SERVER_NODE,
  TYPE_SUBNETWORK_NODE,
  VLAN_FORM,
  VPC_CHILD_FORM,
  VPC_FORM,
} from '@/features/networkCanvas/utils/constants';
import {
  CLOUD_AWS_VALUE,
  CLOUD_AZURE_VALUE,
  CLOUD_GCP_VALUE,
} from '@/shared/constants';
import { INSTANCE_TYPE_OPTIONS } from '../options/instanceTypes';
import { cidrsOverlap, isSubnetOf } from './cidrUtils';
import { translate as tr } from '@/shared/i18n';

// ------------ Reglas base reutilizables ------------

// IPv4 estricta
const ipRegex =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

// CIDR IPv4
const cidrRegex =
  /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\/(3[0-2]|[12]?\d)$/;

const isCidrValid = (value) => {
  try {
    const block = new Netmask(value);
    return !!block;
  } catch {
    return false;
  }
};

// -------------------------------------------------------

export const useFormValidationSchema = (
  formType,
  cidrBlockVPC = null,
  prefixLength = null,
  context = {},
  validateCidr = false
) => {
  const fullVpcCidr =
    cidrBlockVPC && prefixLength ? `${cidrBlockVPC}/${prefixLength}` : cidrBlockVPC;

  switch (formType) {
    /* ================= VLAN ================= */
    case VLAN_FORM:
      return yup.object({
        vlanName: yup
          .string()
          .trim()
          .min(3, tr('canvas.validation.vlanNameMin'))
          .max(60, tr('canvas.validation.vlanNameMax'))
          .required(tr('canvas.validation.vlanNameRequired')),

        cidrBlock: validateCidr
          ? yup
            .string()
            .required(tr('canvas.validation.cidrRequired'))
            .matches(cidrRegex, tr('canvas.validation.cidrFormat'))
            .test('is-valid-cidr', tr('canvas.validation.cidrInvalid'), (value) => isCidrValid(value))
            .test('prefix-range', tr('canvas.validation.cidrPrefixRoom'), (value) => {
              if (!value) return false;
              const [, p] = value.split('/');
              const prefix = Number(p);
              return prefix >= 8 && prefix <= 28;
            })
          : yup.string().required(tr('canvas.validation.cidrRequired')),

        cloudProvider: yup
          .string()
          .transform((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v))
          .oneOf(
            context?.allowedProviders || [CLOUD_AWS_VALUE, CLOUD_GCP_VALUE, CLOUD_AZURE_VALUE],
            tr('canvas.validation.invalidCloudProvider'),
          )
          .required(tr('canvas.validation.cloudProviderRequired')),

        region: yup.string().required(tr('canvas.validation.regionRequired')),

        labNotes: yup
          .string()
          .max(4000, tr('canvas.validation.descriptionMax'))
          .optional(),
      });

    /* ================= VPC (legacy) ================= */
    case VPC_FORM:
      return yup.object({
        cloudProvider: yup.string().required(tr('canvas.validation.cloudProviderRequired')),
        vpcName: yup
          .string()
          .trim()
          .min(1, tr('canvas.validation.vpcNameRequired'))
          .required(tr('canvas.validation.vpcNameRequired')),
        cidrBlock: yup
          .string()
          .required(tr('canvas.validation.cidrRequired'))
          .matches(cidrRegex, tr('canvas.validation.cidrFormat'))
          .test('is-valid-cidr', tr('canvas.validation.cidrInvalid'), (value) => isCidrValid(value)),
      });

    /* ================= VPC hija ================= */
    case VPC_CHILD_FORM: {
      const vlanCidr = context?.vlanCidr || null;
      const siblingVpcCidrs = (context?.siblingVpcCidrs || [])
        .map((c) => (c || '').trim())
        .filter(Boolean);
      const providerNetwork = context?.providerNetwork || {};
      const natRequiresPublicSubnet = providerNetwork.natRequiresPublicZone !== false;
      const supportsElasticIp = providerNetwork.supportsElasticIp !== false;

      return yup.object({
        vpcName: yup
          .string()
          .trim()
          .min(3, tr('canvas.validation.minThree'))
          .max(60, tr('canvas.validation.maxSixty'))
          .required(tr('canvas.validation.nameRequired')),

        cidrBlock: yup
          .string()
          .required(tr('canvas.validation.cidrShortRequired'))
          .matches(cidrRegex, tr('canvas.validation.cidrExample'))
          .test('is-in-vlan', vlanCidr ? tr('canvas.validation.mustBeWithinVlan', { value: vlanCidr }) : tr('canvas.validation.cidrInvalid'), (val) => {
            if (!val) return false;
            if (!vlanCidr) return true;
            try {
              return isSubnetOf(val, vlanCidr);
            } catch {
              return false;
            }
          })
          .test('no-overlap', tr('canvas.validation.cidrOverlapVpc'), (val) => {
            if (!val || !siblingVpcCidrs.length) return true;
            try {
              return !siblingVpcCidrs.some((cidr) => cidrsOverlap(val, cidr));
            } catch {
              return false;
            }
          }),

        region: yup.string().required(tr('canvas.validation.regionRequired')),

        internetGateway: yup
          .boolean()
          .default(false)
          .test('igw-required', tr('canvas.validation.enableIgwForNat'), function (v) {
            const nat = this.parent?.enableNatGateway;
            return nat && natRequiresPublicSubnet ? v === true : true;
          }),

        allowedSshCidr: yup
          .string()
          .trim()
          .nullable()
          .transform((v) => (v === '' ? null : v))
          .matches(/^((\d{1,3}\.){3}\d{1,3}\/(3[0-2]|[12]?\d))$/, tr('canvas.validation.cidrInvalidExample'))
          .optional(),

        /* -------- NAT Gateway -------- */
        enableNatGateway: yup.boolean(),

        natGatewayPublicSubnet: yup.string().when('enableNatGateway', {
          is: true,
          then: (s) =>
            (natRequiresPublicSubnet
              ? s
                .required(tr('canvas.validation.selectPublicSubnetNat'))
                .min(1, tr('canvas.validation.subnetMustBeSelected'))
              : s.optional()),
          otherwise: (s) => s.optional(),
        }),

        natGatewayElasticIp: yup.string().when('enableNatGateway', {
          is: true,
          then: (s) =>
            (supportsElasticIp
              ? s
                .nullable()
                .transform((v) => (v === '' ? null : v))
                .test(
                  'nat-eip-allocation-id',
                  tr('canvas.validation.elasticIpInvalid'),
                  (value) => value == null || /^eipalloc-[a-z0-9]+$/.test(value)
                )
                .notRequired()
              : s.optional()),
          otherwise: (s) => s.optional(),
        }),
      });
    }

    /* ================= Subnet ================= */
    case TYPE_SUBNETWORK_NODE: {
      const providerSubnet = context?.providerSubnet || {};
      const subnetForm = providerSubnet.form || {};
      const requiresAz = (subnetForm.availabilityScope || 'zone') === 'zone';
      const requiresSubnetType = true;

      return yup.object({
        subnetName: yup
          .string()
          .required('Name is required')
          .test('unique-name', 'Subnet name already exists in this VPC', function (value) {
            const names = (context?.existingSubnetNames || [])
              .map((s) => (s || '').trim().toLowerCase());
            if (!value) return false;
            const me = value.trim().toLowerCase();
            return (
              !names.includes(me) ||
              (context?.currentName && me === context.currentName.toLowerCase())
            );
          }),

        cidrBlock: yup
          .string()
          .required('CIDR Block is required')
          .matches(cidrRegex, 'CIDR Block must be a valid CIDR (ej: 192.168.1.0/24)')
          .test(
            'in-range',
            fullVpcCidr
              ? `CIDR Block must be within the VPC range ${fullVpcCidr}`
              : 'Invalid parent VPC CIDR',
            function (value) {
              if (!value) return false;
              if (!fullVpcCidr || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(fullVpcCidr)) return true;
              return isSubnetOf(value, fullVpcCidr);
            }
          )
          .test('no-overlap', 'CIDR overlaps with another subnet in this VPC', function (value) {
            if (!value) return false;
            const val = value.trim();
            const sibs = (context?.existingCidrs || [])
              .map((c) => (c || '').trim())
              .filter(Boolean);
            return !sibs.some((cidr) => cidrsOverlap(val, cidr));
          }),

        availabilityZone: requiresAz
          ? yup.string().required('Zone is required')
          : yup.string().optional(),
        subnetType: requiresSubnetType
          ? yup.string().oneOf(['public', 'private']).required('Subnet Type is required')
          : yup.string().optional(),

        map_public_ip_on_launch: yup
          .boolean()
          .test('public-ip-for-public', 'Public subnets must auto-assign public IPv4', function (v) {
            const t = this.parent?.subnetType;
            return t === 'public' ? v === true : true;
          }),
      });
    }

    /* ================= Instancias ================= */
    case TYPE_COMPUTER_NODE:
    case TYPE_PRINTER_NODE:
    case TYPE_SERVER_NODE:
    case TYPE_INSTANCE_NODE: {
      const emptyToUndef = (v) =>
        v === null || v === undefined || String(v).trim() === '' ? undefined : v;
      const allowedInstanceTypes = (context?.instanceTypeOptions || INSTANCE_TYPE_OPTIONS).map((o) => o.value);

      return yup.object({
        ami: yup.string().transform(emptyToUndef).notRequired(),
        instanceType: yup
          .string()
          .oneOf(allowedInstanceTypes, 'Invalid instance type')
          .required('Instance type is required'),
        ipAddress: yup
          .string()
          .transform((v) => {
            if (!v) return undefined;
            const s = String(v).trim().toLowerCase();
            return s === 'auto' ? undefined : s;
          })
          .notRequired()
          .test('ip-format', 'IP Address must be valid', function (value) {
            if (!value) return true;
            return ipRegex.test(value);
          })
          .test('is-subnet', function (value) {
            if (!value || !cidrBlockVPC) return true;
            try {
              const block = new Netmask(cidrBlockVPC);
              if (!block.contains(value)) {
                return this.createError({
                  message: `The IP ${value} is not within ${cidrBlockVPC}`,
                });
              }
              return true;
            } catch {
              return this.createError({ message: 'Invalid subnet format' });
            }
          })
          .test('not-duplicate', 'This IP address is already used in this subnet', function (value) {
            if (!value || !context.existingIps) return true;
            return !context.existingIps.includes(value.trim());
          }),
        name: yup.string().required('Name is required'),
        sshAccess: yup.string().transform(emptyToUndef).notRequired(),
      });
    }

    /* ================= Router ================= */
    case TYPE_ROUTER_NODE:
      return yup.object({
        internetGateway: yup.boolean(),
        natGateway: yup.boolean(),
      });

    default:
      return yup.object({});
  }
};
