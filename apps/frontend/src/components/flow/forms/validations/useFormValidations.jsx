// src/components/flow/forms/validations/useFormValidations.js
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
} from '../../utils/constants';
import { isCidrInVpcRange, overlapsAny } from '../../utils/networkUtils';
import { INSTANCE_TYPE_OPTIONS } from '../options/instanceTypes';

// IPv4 estricta: 0-255 en cada octeto
const ipRegex =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

// CIDR IPv4 con prefijo /0..32
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

export const useFormValidationSchema = (
  formType,
  cidrBlockVPC = null, // para SUBNET/INSTANCE es el CIDR del padre
  prefixLength = null,
  context = {},
  validateCidr = false
) => {
  // Si recibes "10.0.0.0" y 16 → "10.0.0.0/16"
  const fullVpcCidr =
    cidrBlockVPC && prefixLength ? `${cidrBlockVPC}/${prefixLength}` : cidrBlockVPC;

  switch (formType) {
    /* ------------------------ VLAN (raíz) ------------------------ */
    case VLAN_FORM:
      return yup
        .object({
          vlanName: yup
            .string()
            .trim()
            .min(3, 'VLAN Name must be at least 3 characters')
            .max(60, 'VLAN Name must be at most 60 characters')
            .required('VLAN Name is required'),
          cidrBlock: validateCidr
            ? yup
              .string()
              .required('CIDR Block is required')
              .matches(cidrRegex, 'CIDR Block must be in format 192.168.0.0/24')
              .test('is-valid-cidr', 'CIDR block is invalid', (value) => isCidrValid(value))
              .test(
                'prefix-range',
                'CIDR should leave room for subnets (e.g. /16 to /24)',
                (value) => {
                  if (!value) return false;
                  const [, p] = value.split('/');
                  const prefix = Number(p);
                  return prefix >= 8 && prefix <= 28; // tu política
                }
              )
            : yup.string().required('CIDR Block is required'),
          cloudProvider: yup
            .string()
            .transform((v) => (typeof v === 'string' ? v.toUpperCase() : v))
            .oneOf(['AWS'], 'Invalid Cloud Provider')
            .required('Cloud Provider is required'),
          region: yup.string().required('Region is required'),
        })
        .required();

    /* ------------------------ VPC (legacy) ------------------------ */
    case VPC_FORM:
      return yup
        .object({
          cloudProvider: yup.string().required('Cloud Provider is required'),
          vpcName: yup.string().trim().min(1, 'Name VPC is required').required('Name VPC is required'),
          cidrBlock: yup
            .string()
            .required('CIDR Block is required')
            .matches(cidrRegex, 'CIDR Block must be in format 192.168.0.0/24')
            .test('is-valid-cidr', 'CIDR block is invalid', (value) => isCidrValid(value)),
        })
        .required();

    /* ------------------------ VPC-hija (dentro de VLAN) ------------------------ */
    case VPC_CHILD_FORM: {
      const vlanCidr = context?.vlanCidr || null; // pásalo desde el modal
      const siblingVpcCidrs = (context?.siblingVpcCidrs || [])
        .map((c) => (c || '').trim())
        .filter(Boolean);

      return yup
        .object({
          vpcName: yup.string().trim().min(3, 'Min 3 characters').max(60, 'Max 60').required('Name is required'),
          cidrBlock: yup
            .string()
            .required('CIDR is required')
            .matches(cidrRegex, 'CIDR is invalid (e.g.: 10.0.1.0/24)')
            .test(
              'is-in-vlan',
              vlanCidr ? `Must be within the range ${vlanCidr}` : 'CIDR is invalid',
              (val) => {
                if (!val || !vlanCidr) return false;
                return isCidrInVpcRange(vlanCidr, val);
              }
            )
            // ✅ overlaps reales entre VPCs hermanas (usa networkUtils.overlapsAny)
            .test('no-overlap', 'CIDR overlaps with another VPC in the VLAN', (val) => {
              if (!val) return false;
              const v = val.trim();
              return !overlapsAny(v, siblingVpcCidrs.filter((c) => c !== v));
            }),
          region: yup.string().required('Region is required'),
          // Opcionales para despliegue:
          internetGateway: yup.boolean().default(false),
          allowedSshCidr: yup
            .string()
            .trim()
            .nullable()
            .transform(v => (v === '' ? null : v))
            .matches(/^((\d{1,3}\.){3}\d{1,3}\/(3[0-2]|[12]?\d))$/, 'CIDR inválido (ej: 203.0.113.5/32)')
            .optional(),
          enableNatGateway: yup.boolean(),
          natPublicSubnetId: yup.string().when('enableNatGateway', {
            is: true,
            then: (s) => s.required('Select the public subnet for NAT'),
            otherwise: (s) => s.optional(),
          }),
          natElasticIp: yup.string().when('enableNatGateway', {
            is: true,
            then: (s) => s.trim().min(4, 'EIP is required').required('EIP is required'),
            otherwise: (s) => s.optional(),
          }),
        })
        .required();
    }

    /* ------------------------ Subnet (dentro de VPC-hija) ------------------------ */
    case TYPE_SUBNETWORK_NODE:
      return yup
        .object({
          subnetName: yup
            .string()
            .required('Name is required')
            .test('unique-name', 'Subnet name already exists in this VPC', function (value) {
              const names = (context?.existingSubnetNames || []).map(s => (s || '').trim().toLowerCase());
              if (!value) return false;
              const me = value.trim().toLowerCase();
              return !names.includes(me) || (context?.currentName && me === context.currentName.toLowerCase());
            }),
          cidrBlock: yup
            .string()
            .required('CIDR Block is required')
            .matches(cidrRegex, 'CIDR Block must be a valid CIDR (ej: 192.168.1.0/24)')
            .test(
              'in-range',
              fullVpcCidr ? `CIDR Block must be within the VPC range ${fullVpcCidr}` : 'Invalid parent VPC CIDR',
              function (value) {
                if (!value || !fullVpcCidr) return false;
                return isCidrInVpcRange(fullVpcCidr, value);
              }
            )
            .test('no-overlap', 'CIDR overlaps with another subnet in this VPC', function (value) {
              if (!value) return false;
              const val = value.trim();
              const sibs = (context?.existingCidrs || []).map((c) => (c || '').trim()).filter(Boolean);
              return !overlapsAny(val, sibs.filter((c) => c !== val));
            }),
          availabilityZone: yup.string().required('Zone is required'),
          subnetType: yup.string().oneOf(['public', 'private']).required('Subnet Type is required'),
          map_public_ip_on_launch: yup
            .boolean()
            .test('public-ip-for-public', 'Public subnets must auto-assign public IPv4', function (v) {
              const t = this.parent?.subnetType;
              return t === 'public' ? v === true : true;
            }),
        })
        .required();

    /* ------------------------ Instancia (dentro de Subnet) ------------------------ */



    case TYPE_COMPUTER_NODE:
    case TYPE_PRINTER_NODE:
    case TYPE_SERVER_NODE:
    case TYPE_INSTANCE_NODE: {
      const emptyToUndef = (v) =>
        v === null || v === undefined || String(v).trim() === "" ? undefined : v;

      return yup
        .object({
          // AMI opcional (si viene vacío, no falla)
          ami: yup.string().transform(emptyToUndef).notRequired(),

          // Tipo obligatorio, restringido a la lista válida
          instanceType: yup
            .string()
            .oneOf(INSTANCE_TYPE_OPTIONS.map(o => o.value), 'Invalid instance type')
            .required('Instance type is required'),

          // IP opcional; si el usuario la escribe, se valida formato, rango y duplicados
          ipAddress: yup
            .string()
            .transform((v) => {
              if (!v) return undefined;
              const s = String(v).trim().toLowerCase();
              return s === "auto" ? undefined : s;
            })
            .notRequired()
            .test("ip-format", "IP Address must be a valid IP (0-255 in each segment)", function (value) {
              if (!value) return true; // vacío o "auto" => permitido
              return ipRegex.test(value);
            })
            .test("is-subnet", function (value) {
              if (!value || !cidrBlockVPC) return true;
              try {
                const block = new Netmask(cidrBlockVPC);
                if (!block.contains(value)) {
                  return this.createError({
                    message: `The IP address ${value} is not within the subnet range ${cidrBlockVPC}`,
                  });
                }
                return true;
              } catch {
                return this.createError({ message: "Invalid subnet format" });
              }
            })
            .test("not-duplicate", "This IP address is already used in this subnet", function (value) {
              if (!value || !context.existingIps) return true;
              return !context.existingIps.includes(value.trim());
            }),

          // Nombre obligatorio
          name: yup.string().required('Name is required'),

          // SSH opcional (si lo dejas vacío no marca error)
          sshAccess: yup.string().transform(emptyToUndef).notRequired(),
        })
        .required();
    }

    /* ------------------------ Router ------------------------ */
    case TYPE_ROUTER_NODE:
      return yup
        .object({
          internetGateway: yup.boolean(),
          natGateway: yup.boolean(),
        })
        .required();

    default:
  }
};
