/**
 * Utilidades mínimas para trabajar con CIDR IPv4 sin librerías externas.
 * Todo está deliberadamente explícito para que sea fácil de leer/explicar.
 */

/** Expresión para "x.x.x.x/nn" donde x es 0-255 y nn ∈ [0, 32] */
const cidrRegex =
  /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\/(3[0-2]|[12]?\d)$/;

/** Convierte "192.168.1.10" a un entero de 32 bits (big-endian) */
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return (
    (parts[0] << 24) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  ) >>> 0; // >>> 0 asegura entero sin signo
}

/** Máscara /p como entero (p.ej. /24 => 255.255.255.0) */
function maskFromPrefix(prefix) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** Parsea "A.B.C.D/N" a { baseInt, maskInt, prefix } con validaciones básicas */
export function parseCidr(cidr) {
  if (!cidrRegex.test(String(cidr))) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  const [ip, pStr] = cidr.split('/');
  const prefix = Number(pStr);
  const baseInt = ipToInt(ip);
  const maskInt = maskFromPrefix(prefix);
  return { baseInt, maskInt, prefix };
}

/**
 * Devuelve true si childCIDR es un subconjunto exacto de parentCIDR.
 * Se basa en: (baseChild & maskParent) === (baseParent & maskParent)
 * y que el prefijo hijo sea >= al del padre (más específico).
 */
export function isSubnetOf(childCIDR, parentCIDR) {
  const c = parseCidr(childCIDR);
  const p = parseCidr(parentCIDR);
  const childNet = c.baseInt & p.maskInt;
  const parentNet = p.baseInt & p.maskInt;
  return childNet === parentNet && c.prefix >= p.prefix;
}

/**
 * Dos CIDR se solapan si comparten el mismo “prefijo de intersección”.
 * Toma la máscara más restrictiva (el mayor prefijo) y compara redes.
 */
export function cidrsOverlap(cidrA, cidrB) {
  const a = parseCidr(cidrA);
  const b = parseCidr(cidrB);
  const commonPrefix = Math.min(a.prefix, b.prefix);
  const commonMask = maskFromPrefix(commonPrefix);
  const netA = a.baseInt & commonMask;
  const netB = b.baseInt & commonMask;
  return netA === netB;
}
