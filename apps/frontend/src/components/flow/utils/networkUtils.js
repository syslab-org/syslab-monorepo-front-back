// src/components/flow/utils/networkUtils.js
import { Netmask } from 'netmask';

/** Convierte "A.B.C.D" → entero sin signo para comparar rangos IP. */
const ipToLong = (ip) => {
  const [a, b, c, d] = ip.split('.').map((n) => Number(n));
  return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
};

/** Devuelve [firstLong, lastLong] del rango que cubre un CIDR. */
const cidrRange = (cidr) => {
  const block = new Netmask(cidr);
  return [ipToLong(block.first), ipToLong(block.last)];
};

/** ✅ Verifica solapamiento real entre dos CIDR (sin falsos positivos). */
export const overlapsCidrs = (cidrA, cidrB) => {
  try {
    const [aStart, aEnd] = cidrRange(cidrA);
    const [bStart, bEnd] = cidrRange(cidrB);
    // Se solapan si los rangos se intersectan
    return !(aEnd < bStart || bEnd < aStart);
  } catch (error) {
    console.error('Error checking CIDR overlap:', error);
    // Conservador: si no se puede parsear, trátalo como solapado
    return true;
  }
};

/** ¿El CIDR objetivo se solapa con alguno de la lista? */
export const overlapsAny = (targetCidr, list = []) =>
  list.some((c) => overlapsCidrs(targetCidr, c));

/** child ⊆ parent : ¿el CIDR hijo está completamente dentro del padre? */
export const isCidrInVpcRange = (parentCidr, childCidr) => {
  try {
    const parent = new Netmask(parentCidr);
    const child = new Netmask(childCidr);
    return parent.contains(child.first) && parent.contains(child.last);
  } catch {
    return false;
  }
};
