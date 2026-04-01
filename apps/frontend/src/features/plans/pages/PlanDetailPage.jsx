// apps/frontend/src/features/plans/pages/PlanDetailPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
  LinearProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { TASK_STATE_PENDING, TASK_STATE_RUNNING } from '@/shared/constants';
import { api } from '@/infrastructure/http/api';
import { parseTerraformPlanSummary } from '@/features/plans/utils/parseTerraformPlanSummary';

const POLL_MS = 2000;

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function computeLifecycle(plan) {
  const status = plan?.status;
  const lastAction = String(plan?.last_action || plan?.lastAction || '').toLowerCase();
  const applied = plan?.applied === true;

  const simulateOnly = Boolean(
    plan?.simulate_only ??
    plan?.simulateOnly ??
    plan?.payload?.simulate_only ??
    plan?.payload?.simulateOnly ??
    false
  );

  const isDestroyed = lastAction === 'destroy';
  const hasRealInfra = applied && !isDestroyed;
  const hasPendingActivePreview = applied && lastAction === 'plan';
  const failedRealApply =
    status === 'FAILURE' &&
    lastAction === 'apply' &&
    !simulateOnly &&
    !applied;
  const isRunning = status === TASK_STATE_RUNNING || status === TASK_STATE_PENDING;

  if (isRunning && lastAction === 'destroy') {
    return {
      key: 'DESTROYING',
      label: 'DESTROYING',
      helper: 'Destroy en ejecución: eliminando infraestructura en AWS.',
      chip: { variant: 'filled', color: 'warning' },
      allowDestroy: false,
    };
  }

  if (isRunning && lastAction === 'apply') {
    return {
      key: 'DEPLOYING',
      label: 'DEPLOYING',
      helper: 'Deploy en ejecución: aplicando cambios en AWS.',
      chip: { variant: 'filled', color: 'info' },
      allowDestroy: false,
    };
  }

  // 1️⃣ ACTIVE (infra real viva)
  if (hasRealInfra) {
    return {
      key: 'ACTIVE',
      label: 'ACTIVE',
      helper: hasPendingActivePreview
        ? 'Infraestructura activa en AWS. El último plan fue una previsualización sobre el stack existente; el próximo apply actualizará recursos en el mismo despliegue.'
        : 'Infraestructura activa en AWS.',
      chip: { variant: 'filled', color: 'success' },
      allowDestroy: true,
    };
  }

  // 2️⃣ DESTROYED
  if (isDestroyed) {
    return {
      key: 'DESTROYED',
      label: 'DESTROYED',
      helper: 'Infraestructura eliminada en AWS.',
      chip: { variant: 'outlined', color: 'default' },
      allowDestroy: false,
    };
  }

  // 3️⃣ PREVIEW (solo si NO hay infra real)
  if (simulateOnly) {
    return {
      key: 'PREVIEW',
      label: 'PREVIEW',
      helper: 'Simulado: nunca se aplicó en AWS.',
      chip: { variant: 'outlined', color: 'info' },
      allowDestroy: false,
    };
  }

  // 4️⃣ FAILED REAL APPLY (puede haber recursos parciales)
  if (failedRealApply) {
    return {
      key: 'FAILED_REAL_APPLY',
      label: 'RECOVERY',
      helper: 'El apply real falló. Puede haber recursos parciales en AWS: ejecuta Destroy antes de reintentar.',
      chip: { variant: 'outlined', color: 'error' },
      allowDestroy: true,
    };
  }

  // 5️⃣ NOT APPLIED
  return {
    key: 'NOT_APPLIED',
    label: 'NOT APPLIED',
    helper:
      lastAction === 'canvas_update'
        ? 'Cambios detectados desde el canvas: listo para aplicar en AWS.'
        : 'Plan real aún no aplicado.',
    chip: { variant: 'outlined', color: 'warning' },
    allowDestroy: false,
  };
}

function statusChipProps(status) {
  switch (status) {
    case 'SUCCESS':
      return { label: 'SUCCESS', color: 'success', variant: 'filled' };
    case 'FAILURE':
      return { label: 'FAILURE', color: 'error', variant: 'filled' };
    case 'RUNNING':
      return { label: 'RUNNING', color: 'info', variant: 'filled' };
    case 'PENDING':
      return { label: 'PENDING', color: 'warning', variant: 'filled' };
    default:
      return { label: status || '—', color: 'default', variant: 'outlined' };
  }
}

function describeRunningPhase(plan, lifecycle) {
  const lastAction = String(plan?.last_action || plan?.lastAction || '').toLowerCase();

  if (lastAction === 'apply') {
    return {
      title: 'Aplicando cambios en AWS',
      description:
        'Terraform está ejecutando el apply real sobre la infraestructura. Los recursos pueden tardar unos minutos en completarse y esta vista se actualizará automáticamente.',
      nextStep: 'Si quieres detalle técnico, abre la pestaña Logs y sigue el progreso del apply.',
    };
  }

  if (lastAction === 'destroy') {
    return {
      title: 'Eliminando infraestructura en AWS',
      description:
        'El destroy está desmontando el stack actual. Durante esta fase bloqueamos nuevas acciones para evitar estados inconsistentes.',
      nextStep: 'Cuando termine, revisa Outputs y Logs para confirmar que no quedaron recursos activos.',
    };
  }

  if (lastAction === 'plan') {
    return {
      title: 'Generando previsualización del plan',
      description:
        'Terraform está calculando el impacto del cambio antes de aplicar nada en AWS. En cuanto termine, podrás revisar el resumen de riesgo.',
      nextStep: 'Espera a que aparezca SUCCESS o FAILURE antes de lanzar otra acción.',
    };
  }

  return {
    title: lifecycle.key === 'DEPLOYING' ? 'Procesando ejecución del plan' : 'Procesando solicitud',
    description:
      'Hay una operación en curso sobre este plan y la página está haciendo polling automático para reflejar el resultado en cuanto esté disponible.',
    nextStep: 'Mientras tanto, evita cerrar el flujo o lanzar acciones paralelas sobre el mismo plan.',
  };
}

const safeObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const splitInstanceKey = (key) => {
  const raw = String(key || '');
  const idx = raw.indexOf(':');
  if (idx === -1) return { vpcId: raw, instanceName: raw };
  return {
    vpcId: raw.slice(0, idx),
    instanceName: raw.slice(idx + 1),
  };
};

function buildInstanceCatalog(outputs) {
  const instanceIds = safeObject(outputs?.instance_ids);
  const privateIps = safeObject(outputs?.instance_private_ips);
  const publicIps = safeObject(outputs?.instance_public_ips);

  const keys = Array.from(
    new Set([
      ...Object.keys(instanceIds),
      ...Object.keys(privateIps),
      ...Object.keys(publicIps),
    ]),
  );

  const byVpc = new Map();
  keys.forEach((key) => {
    const { vpcId, instanceName } = splitInstanceKey(key);
    if (!vpcId) return;

    if (!byVpc.has(vpcId)) byVpc.set(vpcId, []);
    byVpc.get(vpcId).push({
      key,
      instanceName,
      instanceId: instanceIds[key] || null,
      privateIp: privateIps[key] || null,
      publicIp: publicIps[key] || null,
    });
  });

  byVpc.forEach((list) => {
    list.sort((a, b) => a.instanceName.localeCompare(b.instanceName));
  });

  return byVpc;
}

function buildVpcInfraCatalog(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];

  const natGatewayIds = safeObject(outputs?.nat_gateway_ids);
  const natEipAllocationIds = safeObject(outputs?.nat_eip_allocation_ids);
  const igwIds = safeObject(outputs?.igw_ids);
  const vpcIds = safeObject(outputs?.vpc_ids);

  return vpcs.map((vpc) => ({
    logicalVpcId: vpc.id,
    name: vpc.name || vpc.id,
    actualVpcId: vpcIds[vpc.id] || null,
    igwId: igwIds[vpc.id] || null,
    natGatewayId: natGatewayIds[vpc.id] || null,
    natEipAllocationId: natEipAllocationIds[vpc.id] || null,
  }));
}

function splitRouterAttachmentKey(key) {
  const raw = String(key || '');
  const idx = raw.indexOf(':');
  if (idx === -1) return { routerId: raw, vpcId: '' };
  return {
    routerId: raw.slice(0, idx),
    vpcId: raw.slice(idx + 1),
  };
}

function buildTransitGatewayCatalog(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const routers = Array.isArray(payload?.routers) ? payload.routers : [];
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];

  const tgwIds = safeObject(outputs?.tgw_ids);
  const tgwAttachmentIds = safeObject(outputs?.tgw_attachment_ids);
  const tgwRouteTableIds = safeObject(outputs?.tgw_route_table_ids);

  const vpcById = new Map(vpcs.map((vpc) => [vpc.id, vpc]));
  const routerById = new Map(
    routers
      .filter((router) => String(router?.type || '').toLowerCase() === 'tgw')
      .map((router) => [router.id, router]),
  );

  const routerIds = Array.from(
    new Set([
      ...routerById.keys(),
      ...Object.keys(tgwIds),
      ...Object.keys(tgwRouteTableIds),
      ...Object.keys(tgwAttachmentIds).map((key) => splitRouterAttachmentKey(key).routerId),
    ]),
  );

  return routerIds.map((routerId) => {
    const router = routerById.get(routerId) || null;
    const attachments = Object.entries(tgwAttachmentIds)
      .filter(([key]) => splitRouterAttachmentKey(key).routerId === routerId)
      .map(([key, attachmentId]) => {
        const { vpcId } = splitRouterAttachmentKey(key);
        const vpc = vpcById.get(vpcId) || null;
        return {
          key,
          vpcId,
          vpcName: vpc?.name || vpcId || 'VPC',
          attachmentId,
        };
      })
      .sort((a, b) => a.vpcName.localeCompare(b.vpcName));

    return {
      routerId,
      name: router?.name || routerId,
      tgwId: tgwIds[routerId] || null,
      routeTableId: tgwRouteTableIds[routerId] || null,
      attachments,
    };
  });
}

function buildConnectivityOverview(plan, outputsResponse, connectivityScenarios) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const routers = Array.isArray(payload?.routers) ? payload.routers : [];

  const peeringDeclared = links.filter((link) => String(link?.type || '').toLowerCase() === 'peering').length;
  const tgwDeclared = routers.filter((router) => String(router?.type || '').toLowerCase() === 'tgw').length;
  const tgwAttachmentsDeclared = links.filter((link) => String(link?.type || '').toLowerCase() === 'tgw-attach').length;
  const peeringActive = Object.keys(safeObject(outputs?.peering_ids)).length;
  const tgwActive = Object.keys(safeObject(outputs?.tgw_ids)).length;
  const tgwAttachmentsActive = Object.keys(safeObject(outputs?.tgw_attachment_ids)).length;

  let modeLabel = 'Aislado';
  if (tgwDeclared > 0 || tgwActive > 0 || tgwAttachmentsDeclared > 0 || tgwAttachmentsActive > 0) {
    modeLabel = 'Transit Gateway';
  } else if (peeringDeclared > 0 || peeringActive > 0) {
    modeLabel = 'Peering';
  }

  return {
    modeLabel,
    connectedPairs: connectivityScenarios.length,
    peeringDeclared,
    peeringActive,
    tgwDeclared,
    tgwActive,
    tgwAttachmentsDeclared,
    tgwAttachmentsActive,
  };
}

function describeConnectivityMode(modeLabel, overview) {
  if (modeLabel === 'Transit Gateway') {
    return `El laboratorio usa un hub central en AWS para enrutar tráfico entre segmentos. TGW activos: ${overview.tgwActive}.`;
  }
  if (modeLabel === 'Peering') {
    return `Las VPC se comunican por enlaces directos entre pares. Peerings activos: ${overview.peeringActive}.`;
  }
  return 'No hay conectividad cruzada activa entre segmentos; cada VPC funciona de forma aislada.';
}

function AwsOutputsInfoDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Guía rápida de infraestructura AWS</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            Esta vista resume la traducción del canvas a recursos reales en AWS. Los códigos como
            `vpc-...`, `igw-...`, `tgw-...` y `tgw-attach-...` son IDs reales creados por AWS.
          </Alert>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Conectividad
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2"><b>Modo declarado</b>: el modelo de conectividad que el canvas está pidiendo. Puede ser Aislado, Peering o Transit Gateway.</Typography>
              <Typography variant="body2"><b>Pares conectados esperados</b>: cuántos pares de segmentos deberían poder comunicarse según el payload y las rutas definidas.</Typography>
              <Typography variant="body2"><b>Peerings activos</b>: cantidad de conexiones VPC Peering realmente creadas en AWS.</Typography>
              <Typography variant="body2"><b>TGW activos</b>: cantidad de Transit Gateways realmente creados en AWS.</Typography>
              <Typography variant="body2"><b>Attachments TGW</b>: uniones entre una VPC y el Transit Gateway. Sin attachment, la VPC no entra al hub.</Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Infraestructura por VPC
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2"><b>VPC</b>: red virtual principal del segmento en AWS.</Typography>
              <Typography variant="body2"><b>IGW</b>: Internet Gateway. Permite salida/entrada a internet para subredes públicas con rutas adecuadas.</Typography>
              <Typography variant="body2"><b>NAT</b>: NAT Gateway. Permite que subredes privadas salgan a internet sin volverse públicas.</Typography>
              <Typography variant="body2"><b>NAT EIP</b>: Elastic IP asociada al NAT Gateway.</Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Infraestructura Transit Gateway
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2"><b>Router lógico</b>: identificador del nodo del canvas. Sirve para relacionar el diseño con los recursos AWS.</Typography>
              <Typography variant="body2"><b>TGW</b>: Transit Gateway de AWS. Actúa como hub central de conectividad.</Typography>
              <Typography variant="body2"><b>TGW RT</b>: tabla de rutas interna del Transit Gateway.</Typography>
              <Typography variant="body2"><b>Attachment</b>: conexión física/lógica entre una VPC y el TGW.</Typography>
            </Stack>
          </Box>

          <Alert severity="warning" variant="outlined">
            Regla práctica: primero mira el modo de conectividad y los pares esperados; después baja a IDs solo si necesitas depurar o verificar un recurso puntual en AWS.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function buildPlanAdvisories(plan, outputsResponse, lifecycle) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const routers = Array.isArray(payload?.routers) ? payload.routers : [];

  const publicIps = safeObject(outputs?.instance_public_ips);
  const publicIpv4InUse = Object.values(publicIps).filter((value) => Boolean(String(value || '').trim())).length;

  const instanceCount = vpcs.reduce(
    (acc, vpc) =>
      acc +
      (Array.isArray(vpc?.subnets) ? vpc.subnets : []).reduce(
        (subAcc, subnet) => subAcc + ((Array.isArray(subnet?.instances) ? subnet.instances.length : 0)),
        0,
      ),
    0,
  );
  const natVpcs = vpcs.filter((vpc) => Boolean(vpc?.nat_gateway?.enabled));
  const natCount = natVpcs.length;
  const providedNatEips = natVpcs
    .map((vpc) => String(vpc?.nat_gateway?.elastic_ip || '').trim())
    .filter(Boolean);
  const tgwCount = routers.filter((router) => String(router?.type || '').toLowerCase() === 'tgw').length;
  const tgwAttachmentCount = links.filter((link) => String(link?.type || '').toLowerCase() === 'tgw-attach').length;
  const peeringCount = links.filter((link) => String(link?.type || '').toLowerCase() === 'peering').length;
  const publicSubnetCount = vpcs.reduce(
    (acc, vpc) =>
      acc +
      (Array.isArray(vpc?.subnets) ? vpc.subnets : []).filter(
        (subnet) => String(subnet?.subnet_type || '').toLowerCase() === 'public',
      ).length,
    0,
  );
  const privateSubnetCount = vpcs.reduce(
    (acc, vpc) =>
      acc +
      (Array.isArray(vpc?.subnets) ? vpc.subnets : []).filter(
        (subnet) => String(subnet?.subnet_type || '').toLowerCase() === 'private',
      ).length,
    0,
  );

  const costs = [];
  if (lifecycle.key === 'ACTIVE' || lifecycle.key === 'DEPLOYING' || lifecycle.key === 'FAILED_REAL_APPLY') {
    costs.push({
      severity: 'warning',
      text: 'Este plan usa APPLY real o quedó parcialmente aplicado: puede generar costo monetario en AWS mientras existan recursos activos.',
    });
  } else if (lifecycle.key === 'PREVIEW' || lifecycle.key === 'NOT_APPLIED') {
    costs.push({
      severity: 'info',
      text: 'En modo PLAN/preview no se crean recursos reales, por lo que este plan no debería generar costo directo en AWS.',
    });
  } else if (lifecycle.key === 'DESTROYED') {
    costs.push({
      severity: 'success',
      text: 'El stack principal figura destruido. Si no dejaste recursos externos o residuales, este plan ya no debería seguir generando costo principal.',
    });
  }

  if (instanceCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: `${instanceCount} instancia(s) EC2 declarada(s): generan costo de compute y, normalmente, de almacenamiento mientras existan.`,
    });
  }
  if (natCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: `${natCount} NAT Gateway(s): AWS cobra por hora aprovisionada y por tráfico procesado mientras estén activos.`,
    });
  }
  if (publicIpv4InUse > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: `${publicIpv4InUse} IPv4 pública(s) en uso según outputs: AWS cobra las IPv4 públicas en uso.`,
    });
  }
  if (tgwCount > 0 || tgwAttachmentCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: `${tgwCount} TGW router(s) y ${tgwAttachmentCount} attachment(s): Transit Gateway agrega cobro por attachment/hora y por tráfico procesado.`,
    });
  }
  if (peeringCount > 0) {
    costs.push({
      severity: 'info',
      text: `${peeringCount} peering link(s): crear el peering no agrega cargo fijo, pero el tráfico por peering puede generar cobros según el patrón de transferencia.`,
    });
  }
  costs.push({
    severity: 'info',
    text: 'La VPC en sí no tiene cargo adicional por existir, pero algunos componentes asociados sí lo tienen.',
  });

  const residuals = [];
  if (providedNatEips.length > 0) {
    residuals.push({
      severity: 'warning',
      text: `${providedNatEips.length} EIP(s) fue/fueron aportada(s) manualmente al NAT. Destroy no las libera por seguridad; pueden seguir generando cobro por IPv4 pública mientras permanezcan reservadas en tu cuenta.`,
    });
  } else if (natCount > 0) {
    residuals.push({
      severity: 'info',
      text: 'Si el NAT usó una EIP autogenerada por el stack, Destroy intenta eliminar tanto el NAT como esa EIP. Si aún ves una Elastic IP, revisa si pertenece a otro recurso o a un deploy previo.',
    });
  }
  residuals.push({
    severity: 'info',
    text: 'Los outputs guardados en esta página son históricos para auditoría/debug. No son recursos vivos en AWS y no generan costo por sí mismos.',
  });
  residuals.push({
    severity: 'info',
    text: 'AWS mantiene un DHCP option set por defecto por región. Este proyecto no crea uno dedicado, así que verlo en consola no implica que el destroy haya dejado un residuo de este stack.',
  });
  if (lifecycle.key === 'FAILED_REAL_APPLY') {
    residuals.push({
      severity: 'warning',
      text: 'Si un APPLY real falla, puede quedar infraestructura parcial. En ese estado debes ejecutar Destroy y revisar logs antes de volver a aplicar.',
    });
  }

  const pedagogy = [];
  if (natCount > 0 && privateSubnetCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: 'Pedagógicamente, este laboratorio separa salida y exposición: NAT permite salida desde subnets privadas, pero no acceso entrante desde Internet.',
    });
  }
  if (publicSubnetCount > 0 && privateSubnetCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: `Tienes ${publicSubnetCount} subnet(s) pública(s) y ${privateSubnetCount} privada(s): es un buen caso para observar bastion pública + workload privada.`,
    });
  }
  if (providedNatEips.length > 0) {
    pedagogy.push({
      severity: 'info',
      text: 'Usar una EIP propia fija la identidad de salida del NAT, pero también deja su ciclo de vida bajo responsabilidad del operador.',
    });
  }
  if (peeringCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: 'El peering enseña conectividad punto a punto: necesitas rutas explícitas de ida y vuelta para obtener comunicación completa.',
    });
  }
  if (tgwCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: 'Transit Gateway enseña un modelo hub-and-spoke: simplifica topologías multipunto, pero añade costo y una capa adicional de routing.',
    });
  }
  if (instanceCount === 0) {
    pedagogy.push({
      severity: 'info',
      text: 'Sin instancias, este plan sirve para estudiar topología y rutas, pero no para validar conectividad extremo a extremo dentro del laboratorio.',
    });
  }

  return { costs, residuals, pedagogy };
}

const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);

function buildConnectivityScenarios(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const outputs = safeObject(outputsResponse?.outputs);

  const vpcById = new Map(
    vpcs.map((vpc) => [
      vpc.id,
      {
        id: vpc.id,
        name: vpc.name || vpc.id,
        cidr: vpc.cidr_block || 'CIDR n/a',
      },
    ]),
  );

  const pairMap = new Map();
  const upsertPair = (aId, bId, mode, routerId) => {
    if (!aId || !bId || aId === bId) return;
    const key = pairKey(aId, bId);
    if (!pairMap.has(key)) {
      pairMap.set(key, {
        aId: aId < bId ? aId : bId,
        bId: aId < bId ? bId : aId,
        modes: new Set(),
        routers: new Set(),
      });
    }
    const item = pairMap.get(key);
    if (mode) item.modes.add(mode);
    if (routerId) item.routers.add(routerId);
  };

  links
    .filter((link) => String(link?.type || '').toLowerCase() === 'peering')
    .forEach((link) => {
      upsertPair(link.vpc_a_id, link.vpc_b_id, 'peering', link.via_router_id);
    });

  const tgwByRouter = new Map();
  links
    .filter((link) => String(link?.type || '').toLowerCase() === 'tgw-attach')
    .forEach((link) => {
      if (!link?.router_id || !link?.vpc_id) return;
      if (!tgwByRouter.has(link.router_id)) tgwByRouter.set(link.router_id, []);
      tgwByRouter.get(link.router_id).push(link.vpc_id);
    });

  tgwByRouter.forEach((routerVpcIds, routerId) => {
    const uniqueVpcIds = Array.from(new Set(routerVpcIds));
    for (let i = 0; i < uniqueVpcIds.length; i += 1) {
      for (let j = i + 1; j < uniqueVpcIds.length; j += 1) {
        upsertPair(uniqueVpcIds[i], uniqueVpcIds[j], 'tgw', routerId);
      }
    }
  });

  const instanceCatalog = buildInstanceCatalog(outputs);
  return Array.from(pairMap.values()).map((pair) => {
    const aVpc = vpcById.get(pair.aId) || { id: pair.aId, name: pair.aId, cidr: 'CIDR n/a' };
    const bVpc = vpcById.get(pair.bId) || { id: pair.bId, name: pair.bId, cidr: 'CIDR n/a' };
    const aInstances = instanceCatalog.get(pair.aId) || [];
    const bInstances = instanceCatalog.get(pair.bId) || [];
    const src = aInstances[0] || null;
    const dst = bInstances[0] || null;
    const reverseSrc = bInstances[0] || null;
    const reverseDst = aInstances[0] || null;

    const modeNames = Array.from(pair.modes);
    const modeLabel =
      modeNames.length === 0
        ? 'Sin modo'
        : modeNames.length > 1
          ? 'Mixto'
          : modeNames[0] === 'tgw'
            ? 'Transit Gateway'
            : 'Peering';

    const checks = [];
    if (src?.privateIp && dst?.privateIp) {
      checks.push({
        title: `Prueba ida (${aVpc.name} -> ${bVpc.name})`,
        command: `ping -c 4 ${dst.privateIp}`,
        context: src.publicIp
          ? `Ejecutar dentro de ${src.instanceName} (${src.publicIp})`
          : `Ejecutar dentro de ${src.instanceName} (${src.instanceId || 'sin instance_id'})`,
      });
    }
    if (reverseSrc?.privateIp && reverseDst?.privateIp) {
      checks.push({
        title: `Prueba retorno (${bVpc.name} -> ${aVpc.name})`,
        command: `ping -c 4 ${reverseDst.privateIp}`,
        context: reverseSrc.publicIp
          ? `Ejecutar dentro de ${reverseSrc.instanceName} (${reverseSrc.publicIp})`
          : `Ejecutar dentro de ${reverseSrc.instanceName} (${reverseSrc.instanceId || 'sin instance_id'})`,
      });
    }

    return {
      ...pair,
      aVpc,
      bVpc,
      modeLabel,
      routers: Array.from(pair.routers),
      src,
      dst,
      checks,
      readyForRun: checks.length >= 2,
    };
  });
}

function buildConsoleTestGuide(plan, outputsResponse, connectivityScenarios) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const instanceCatalog = buildInstanceCatalog(outputs);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];

  const bastions = vpcs
    .map((vpc) => {
      const instances = instanceCatalog.get(vpc.id) || [];
      const primary = instances[0] || null;
      const subnet = Array.isArray(vpc.subnets) ? vpc.subnets[0] : null;
      const declaredInstance = subnet?.instances?.[0] || null;
      return {
        vpcId: vpc.id,
        vpcName: vpc.name || vpc.id,
        cidr: vpc.cidr_block || 'n/a',
        region: vpc.region || payload?.vlan?.region || 'us-east-1',
        availabilityZone: subnet?.availability_zone || 'n/a',
        instanceName: primary?.instanceName || declaredInstance?.name || 'instancia',
        instanceId: primary?.instanceId || null,
        publicIp: primary?.publicIp || null,
        privateIp: primary?.privateIp || declaredInstance?.ip_address || null,
        keyPair: declaredInstance?.ssh_access || 'tu-keypair',
      };
    })
    .filter((item) => item.instanceId || item.publicIp);

  return {
    region: payload?.vlan?.region || bastions[0]?.region || 'us-east-1',
    bastions,
    scenarios: connectivityScenarios,
  };
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [deploying, setDeploying] = useState(false);
  const [destroying, setDestroying] = useState(false);

  const [applyMode, setApplyMode] = useState(false); // false=PLAN preview, true=APPLY real

  const [tab, setTab] = useState('summary');

  const [outputsResponse, setOutputsResponse] = useState(null); // { plan_id, applied, status, outputs }
  const [outputsLoading, setOutputsLoading] = useState(false);
  const [outputsInfoOpen, setOutputsInfoOpen] = useState(false);
  const [outputsJsonOpen, setOutputsJsonOpen] = useState(false);

  const [logText, setLogText] = useState(null);
  const [planRiskSummary, setPlanRiskSummary] = useState(null);
  const [lastDestroyTaskId, setLastDestroyTaskId] = useState(null);
  const [consoleGuideOpen, setConsoleGuideOpen] = useState(false);

  const [msg, setMsg] = useState(null); // { text: string, severity: 'success'|'info'|'warning'|'error' }
  const [err, setErr] = useState(null);

  const timerRef = useRef(null);
  const msgTimerRef = useRef(null);
  const prevStatusRef = useRef(null);
  const actionLockRef = useRef(false);

  const isRunning = plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING;

  const lifecycle = useMemo(() => computeLifecycle(plan), [plan]);
  const runningPhase = useMemo(() => describeRunningPhase(plan, lifecycle), [plan, lifecycle]);
  const connectivityScenarios = useMemo(
    () => buildConnectivityScenarios(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const vpcInfraCatalog = useMemo(
    () => buildVpcInfraCatalog(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const transitGatewayCatalog = useMemo(
    () => buildTransitGatewayCatalog(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const consoleGuide = useMemo(
    () => buildConsoleTestGuide(plan, outputsResponse, connectivityScenarios),
    [plan, outputsResponse, connectivityScenarios],
  );
  const connectivityOverview = useMemo(
    () => buildConnectivityOverview(plan, outputsResponse, connectivityScenarios),
    [plan, outputsResponse, connectivityScenarios],
  );
  const planAdvisories = useMemo(
    () => buildPlanAdvisories(plan, outputsResponse, lifecycle),
    [plan, outputsResponse, lifecycle],
  );
  const linkedCanvasId =
    plan?.canvas_id ||
    plan?.canvasId ||
    plan?.payload?.canvas_id ||
    plan?.payload?.canvasId ||
    plan?.lab?.id ||
    null;
  const hasOutputsData = Boolean(
    outputsResponse?.outputs &&
      typeof outputsResponse.outputs === 'object' &&
      Object.keys(outputsResponse.outputs).length > 0,
  );

  const busy = deploying || destroying;
  const riskSeverity = planRiskSummary?.severity || 'none';
  const riskAlertSeverity =
    riskSeverity === 'destructive'
      ? 'error'
      : riskSeverity === 'caution'
        ? 'warning'
        : 'info';

  function getConflictMessage(e, fallback) {
    const payload = e?.data ?? e?.response?.data;
    const code = payload?.code;
    const taskId = payload?.task_id || payload?.taskId;

    if (code === 'PLAN_RUNNING') {
      return `${payload?.error || fallback}${taskId ? ` (task_id=${taskId})` : ''}`;
    }

    const backendMsg =
      payload?.error ||
      payload?.detail ||
      (typeof payload === 'string' ? payload : null);

    return backendMsg || fallback;
  }

  // Deploy permitido cuando el plan NO está corriendo
  const canDeploy = !isRunning;

  // Destroy permitido según regla backend (incluye apply real fallido), y no está corriendo
  const canDestroy =
    !isRunning &&
    Boolean(
      plan?.can_destroy ??
      (plan?.applied === true &&
        String(plan?.last_action || '').toLowerCase() !== 'destroy')
    );

  const fetchPlan = useCallback(
    async ({ resetLoading = false } = {}) => {
      if (!id) return;
      if (resetLoading) setLoading(true);
      try {
        const prevStatus = prevStatusRef.current;

        const data = await api.getPlan(id);
        setPlan(data);
        setLoading(false);

        const nowStatus = data?.status;
        const nowTerminal = nowStatus === 'SUCCESS' || nowStatus === 'FAILURE';
        const wasRunning = prevStatus === TASK_STATE_RUNNING || prevStatus === TASK_STATE_PENDING;

        const nowRunning = nowStatus === TASK_STATE_RUNNING || nowStatus === TASK_STATE_PENDING;

        // Si el plan está corriendo y no hay mensaje activo, muestra uno único (evita duplicados)
        if (nowRunning && !msg) {
          setMsg({
            severity: 'info',
            text: `Plan en ejecución. Espera a que termine antes de lanzar otra acción.${data?.task_id ? ` (task_id=${data.task_id})` : ''}`,
          });
        }

        // Si inició una acción y el usuario recarga la página mientras estaba RUNNING,
        // igual queremos limpiar el banner “iniciado” cuando detectemos estado terminal.
        const msgLooksLikeStarted =
          typeof msg === 'object' &&
          typeof msg?.text === 'string' &&
          msg.text.toLowerCase().includes('iniciado');

        if ((wasRunning && nowTerminal) || (msgLooksLikeStarted && nowTerminal)) {
          const terminalSeverity = nowStatus === 'SUCCESS' ? 'success' : 'error';
          setMsg({
            severity: terminalSeverity,
            text: `Terminó: ${nowStatus}${nowStatus === 'FAILURE' && data?.error ? ` — ${data.error}` : ''}`,
          });
        }

        // Actualiza el prevStatus para el próximo poll
        prevStatusRef.current = nowStatus;

        // Poll solo si está corriendo
        if (nowStatus === TASK_STATE_RUNNING || nowStatus === TASK_STATE_PENDING) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => fetchPlan(), POLL_MS);
        }
      } catch (e) {
        setLoading(false);
        setErr(`Error cargando plan: ${e?.message || String(e)}`);
        // eslint-disable-next-line no-console
        console.error(e);
      }
    },
    // OJO: incluimos `id` y `msg` porque usamos ambos para decidir si limpiar el banner.
    // No incluimos `plan` para evitar estados viejos.
    [id, msg]
  );

  async function fetchOutputs() {
    if (!id) return;
    setOutputsLoading(true);
    setErr(null);

    try {
      // Usamos el helper centralizado para evitar inconsistencias de baseURL y parsing.
      const json = await api.getPlanOutputs(id);
      // El backend responde: { plan_id, applied, status, outputs }
      setOutputsResponse(json || null);
    } catch (e) {
      // Axios-style errors: e.response?.data suele traer {error, detail, ...}
      const backendMsg = e?.response?.data?.error || e?.response?.data?.detail;
      const msg = backendMsg || e?.message || String(e);
      setErr(`No pude cargar outputs: ${msg}`);
      // eslint-disable-next-line no-console
      console.error('getPlanOutputs failed', e?.response?.status, e?.response?.data, e);
    } finally {
      setOutputsLoading(false);
    }
  }

  async function fetchTaskLog(taskId) {
    if (!taskId) return;
    try {
      const ts = await api.taskStatus(taskId);
      const log = ts?.result?.log || ts?.result?.error || ts?.error || '(sin log)';
      setLogText(log);
      setPlanRiskSummary(parseTerraformPlanSummary(log));
    } catch (e) {
      setLogText(`No se pudo leer el log: ${String(e)}`);
      setPlanRiskSummary(null);
    }
  }

  async function fetchPlanLogs() {
    if (!id) return;
    setErr(null);

    try {
      const resp = await api.getPlanLogs(id);
      const text = resp?.log ?? '';
      const finalText = text && String(text).trim().length > 0 ? text : '(sin log guardado)';
      setLogText(finalText);
      setPlanRiskSummary(parseTerraformPlanSummary(finalText));
    } catch (e) {
      // Fallback: intenta leer el log desde task_status si existe task_id
      if (plan?.task_id) {
        await fetchTaskLog(plan.task_id);
        return;
      }
      const backendMsg = e?.response?.data?.error || e?.response?.data?.detail;
      const msg = backendMsg || e?.message || String(e);
      setErr(`No pude cargar logs: ${msg}`);
      setPlanRiskSummary(null);
    }
  }

  useEffect(() => {
    // reset de prevStatus cuando cambia el id
    prevStatusRef.current = null;
    fetchPlan({ resetLoading: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [fetchPlan, id]);

  useEffect(() => {
    if (tab !== 'logs') return;
    if (logText) return;
    // intenta cargar el log persistido automáticamente al entrar al tab
    fetchPlanLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  useEffect(() => {
    // Auto-oculta el mensaje de término (SUCCESS/FAILURE) luego de 5s.
    const isTerminalMsg =
      msg && typeof msg === 'object' && typeof msg.text === 'string' && msg.text.startsWith('Terminó:');

    if (!isTerminalMsg) return undefined;

    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 5000);

    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [msg]);

  const handleDeploy = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (busy || isRunning) {
      actionLockRef.current = false;
      return;
    }
    setDeploying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    prevStatusRef.current = plan?.status ?? null;
    try {
      // backend espera simulate_only; api.deployPlan en tu proyecto ya hace el mapeo.
      const res = await api.deployPlan(id, { applyMode });
      setMsg({
        severity: 'info',
        text: `Deploy ${applyMode ? 'APPLY' : 'PLAN'} iniciado.${res?.task_id ? ` task_id=${res.task_id}` : ''} (actualizando estado…)`,
      });
      await fetchPlan();
      // Si estamos en tab logs, auto-carga el log
      if (res?.task_id && tab === 'logs') {
        await fetchTaskLog(res.task_id);
      }
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      const payload = e?.data ?? e?.response?.data;
      // If the backend says "conflict" (already running), treat it as info and refresh status
      if (status === 409) {
        setErr(null);
        setMsg({
          severity: 'info',
          text: getConflictMessage(
            e,
            'Plan en ejecución. Espera a que termine antes de lanzar otra acción.'
          ),
        });
        await fetchPlan();
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(`Fallo al iniciar deploy: ${backendMsg || e?.message || String(e)}`);
    } finally {
      actionLockRef.current = false;
      setDeploying(false);
    }
  };

  const handleDestroy = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (busy || isRunning) {
      actionLockRef.current = false;
      return;
    }
    if (!canDestroy) {
      actionLockRef.current = false;
      return;
    }
    if (
      !window.confirm(
        'Esto destruirá los recursos en AWS asociados a ESTE plan.\n\n¿Continuar?'
      )
    ) {
      actionLockRef.current = false;
      return;
    }

    setDestroying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);

    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    prevStatusRef.current = plan?.status ?? null;

    try {
      const res = await api.destroyPlan(id);
      const tid = res?.task_id;
      setLastDestroyTaskId(tid || null);
      setMsg({
        severity: 'info',
        text: `Destroy encolado${tid ? ` (task_id=${tid})` : ''}. Revisa Logs para ver el progreso.`,
      });
      await fetchPlan();
      if (tid && tab === 'logs') {
        await fetchTaskLog(tid);
      }
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      const payload = e?.data ?? e?.response?.data;
      if (status === 409) {
        setErr(null);
        setMsg({
          severity: 'info',
          text: getConflictMessage(
            e,
            'Plan en ejecución. Espera a que termine antes de lanzar otra acción.'
          ),
        });
        await fetchPlan();
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(`Fallo al iniciar destroy: ${backendMsg || e?.message || String(e)}`);
    } finally {
      actionLockRef.current = false;
      setDestroying(false);
    }
  };

  const canOpenConsoleGuide =
    Boolean(plan?.applied) &&
    connectivityScenarios.length > 0 &&
    hasOutputsData;

  const isRedeployAvailable = lifecycle.key === 'ACTIVE' || lifecycle.key === 'FAILED_REAL_APPLY';
  const deployActionLabel = isRedeployAvailable
    ? applyMode
      ? 'Redeploy (APPLY)'
      : 'Redeploy (PLAN)'
    : applyMode
      ? 'Deploy (APPLY)'
      : 'Deploy (PLAN)';
  const actionAvailability = isRunning
    ? {
        severity: 'info',
        text: 'Hay una ejecución en curso. Espera a que termine para lanzar otra acción.',
      }
    : canDestroy && isRedeployAvailable
      ? {
          severity: 'warning',
          text: 'Infraestructura activa: puedes revalidar, redeployar sobre el mismo stack o destruirlo.',
        }
      : canDeploy && lifecycle.key === 'NOT_APPLIED'
        ? {
            severity: 'info',
            text: 'Plan listo para su primer deploy. Destroy no aplica todavía porque no hay infraestructura activa.',
          }
        : canDeploy && lifecycle.key === 'PREVIEW'
          ? {
              severity: 'info',
              text: 'Plan en modo preview: puedes seguir validando o lanzar el primer deploy real.',
            }
          : canDestroy
            ? {
                severity: 'warning',
                text: 'Hay recursos o estado recuperable: destroy está disponible para limpiar el stack.',
              }
            : null;

  const header = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {plan?.name || 'Plan'}
        </Typography>
        <Typography component="div" variant="body2" color="text.secondary">
          ID: <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{id}</Box>
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
        <Chip size="small" {...statusChipProps(plan?.status)} />
        <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />

        <Chip
          size="small"
          label={
            Boolean(
              plan?.simulate_only ??
              plan?.simulateOnly ??
              plan?.payload?.simulate_only ??
              plan?.payload?.simulateOnly ??
              true
            )
              ? 'PREVIEW'
              : 'REAL'
          }
          variant="outlined"
          color={
            Boolean(
              plan?.simulate_only ??
              plan?.simulateOnly ??
              plan?.payload?.simulate_only ??
              plan?.payload?.simulateOnly ??
              true
            )
              ? 'info'
              : 'success'
          }
        />

        <Button variant="outlined" onClick={() => navigate('/admin/plans')}>
          Volver
        </Button>
        {linkedCanvasId && (
          <Button
            variant="contained"
            onClick={() => navigate(`/admin/labs/${linkedCanvasId}/canvas`)}
          >
            Ir al canvas
          </Button>
        )}
      </Stack>
    </Stack>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Cargando plan…</Typography>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="warning">Plan no encontrado.</Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/plans')}>
              Volver
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          {header}

          <Divider sx={{ my: 2 }} />

          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          {msg && (
            <Alert severity={typeof msg === 'string' ? 'success' : msg.severity || 'success'} sx={{ mb: 2 }}>
              {typeof msg === 'string' ? msg : msg.text}
            </Alert>
          )}
          {plan?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plan.error}
            </Alert>
          )}
          {(String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Plan actualizado desde canvas. Hay cambios pendientes; ejecuta <b>Deploy</b> para aplicar la nueva infraestructura.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Typography component="div" variant="body2" color="text.secondary">
                Actualizado: <b>{formatDateTime(plan?.updated_at)}</b>
              </Typography>
              <Typography component="div" variant="body2" color="text.secondary">
                Última acción: <b>{plan?.last_action || plan?.lastAction || '—'}</b>
              </Typography>
              {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.
                </Typography>
              )}
              <Typography component="div" variant="body2" color="text.secondary">
                task_id: <b>{plan?.task_id || '—'}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {lifecycle.helper}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={applyMode}
                      onChange={(e) => setApplyMode(e.target.checked)}
                      disabled={busy || isRunning}
                    />
                  }
                  label={applyMode ? 'Modo APPLY (real)' : 'Modo PLAN (preview)'}
                />

                <Button
                  variant="contained"
                  onClick={handleDeploy}
                  disabled={!canDeploy || busy}
                  color={isRedeployAvailable ? 'warning' : 'primary'}
                >
                  {deploying ? 'Lanzando…' : deployActionLabel}
                </Button>

                {canDestroy && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDestroy}
                    disabled={!canDestroy || busy}
                  >
                    {destroying ? 'Destruyendo…' : 'Destroy'}
                  </Button>
                )}
              </>
            </Stack>
          </Stack>

          {actionAvailability && (
            <Alert severity={actionAvailability.severity} sx={{ mt: 2 }}>
              {actionAvailability.text}
            </Alert>
          )}

          {isRunning && (
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 2,
                borderColor: 'info.light',
                bgcolor: 'info.50',
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <CircularProgress size={18} />
                    <Box>
                      <Typography variant="subtitle2">
                        {runningPhase.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {runningPhase.description}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    color="info"
                    variant="filled"
                    label="Actualización automática activa"
                  />
                </Stack>

                <LinearProgress />

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  alignItems={{ md: 'center' }}
                  justifyContent="space-between"
                >
                  <Typography variant="body2" color="text.secondary">
                    {runningPhase.nextStep}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Task: ${plan?.task_id || 'pendiente'}`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Última acción: ${plan?.last_action || plan?.lastAction || '—'}`}
                    />
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Paper>

        <Paper sx={{ p: 0 }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="summary" label="Resumen" />
            <Tab value="outputs" label="Outputs" />
            <Tab value="tests" label="Pruebas" />
            <Tab value="logs" label="Logs" />
            <Tab value="payload" label="Payload" />
          </Tabs>

          <Divider />

          {/* SUMMARY */}
          {tab === 'summary' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Estado del plan
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip size="small" {...statusChipProps(plan?.status)} />
                <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />
              </Stack>

              <Typography component="div" variant="body2" color="text.secondary">
                Este detalle sirve para entender <b>qué pasó</b> (status), <b>qué existe hoy</b> (lifecycle) y
                <b> qué acciones son válidas</b> (deploy/destroy).
              </Typography>

              {/* Microcopy aclaratorio */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                El estado indica la última ejecución; el lifecycle indica qué existe hoy en AWS.
              </Typography>

              {/* Bloque Última ejecución */}
              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Última ejecución
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Última acción:{' '}
                      <b>{plan?.last_action || plan?.lastAction || '—'}</b>
                    </Typography>
                    {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.
                      </Typography>
                    )}
                    <Typography component="div" variant="body2" color="text.secondary">
                      Resultado:{' '}
                      <Chip size="small" {...statusChipProps(plan?.status)} />
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Fecha:{' '}
                      <b>{formatDateTime(plan?.updated_at)}</b>
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Riesgo del último plan
                </Typography>
                {!planRiskSummary ? (
                  <Alert severity="info" variant="outlined">
                    Carga la pestaña de logs para resumir qué detectó Terraform en el último plan.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    <Alert severity={riskAlertSeverity} variant="outlined">
                      {riskSeverity === 'destructive'
                        ? 'Se detectaron cambios con destrucción o reemplazo de recursos.'
                        : riskSeverity === 'caution'
                          ? 'Se detectaron cambios sobre recursos existentes.'
                          : riskSeverity === 'safe'
                            ? 'Se detectaron cambios aditivos.'
                            : 'No se detectaron cambios en el último plan.'}
                    </Alert>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`Add: ${planRiskSummary.add}`} size="small" />
                      <Chip label={`Change: ${planRiskSummary.change}`} size="small" />
                      <Chip label={`Destroy: ${planRiskSummary.destroy}`} size="small" color={planRiskSummary.destroy > 0 ? 'error' : 'default'} />
                      <Chip label={`Replace: ${planRiskSummary.replace}`} size="small" color={planRiskSummary.replace > 0 ? 'error' : 'default'} />
                    </Stack>
                    {Array.isArray(planRiskSummary.examples) && planRiskSummary.examples.length > 0 && (
                      <Stack spacing={0.5}>
                        {planRiskSummary.examples.map((item) => (
                          <Typography key={`${item.action}-${item.resource}`} variant="caption" color="text.secondary">
                            {item.action.toUpperCase()}: {item.resource}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Costo, residuos y lectura técnica
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Este bloque se calcula desde el payload, los outputs cargados y el estado actual del plan.
                </Typography>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      1. Costo potencial
                    </Typography>
                    <Stack spacing={1}>
                      {planAdvisories.costs.map((item, idx) => (
                        <Alert key={`cost-${idx}`} severity={item.severity} variant="outlined">
                          {item.text}
                        </Alert>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      2. Qué puede quedar tras Destroy
                    </Typography>
                    <Stack spacing={1}>
                      {planAdvisories.residuals.map((item, idx) => (
                        <Alert key={`residual-${idx}`} severity={item.severity} variant="outlined">
                          {item.text}
                        </Alert>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      3. Lectura pedagógica y técnica
                    </Typography>
                    <Stack spacing={1}>
                      {planAdvisories.pedagogy.map((item, idx) => (
                        <Alert key={`pedagogy-${idx}`} severity={item.severity} variant="outlined">
                          {item.text}
                        </Alert>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          )}

          {/* OUTPUTS */}
          {tab === 'outputs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Outputs</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Resumen pensado para entender rápido qué quedó creado en AWS sin perderte en demasiados IDs.
                  </Typography>
                </Box>
                <Button
                  variant="text"
                  startIcon={<InfoOutlinedIcon />}
                  onClick={() => setOutputsInfoOpen(true)}
                >
                  Info AWS
                </Button>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? 'Cargando…' : 'Cargar outputs'}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!outputsResponse && (
                  <Alert severity="info">
                    Aún no se han cargado outputs. Haz clic en “Cargar outputs”.
                  </Alert>
                )}

                {outputsResponse && (
                  <>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                      <Chip size="small" label={`backend_status: ${outputsResponse?.status ?? '—'}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={outputsResponse?.applied ? 'APPLIED: true' : 'APPLIED: false'}
                        color={outputsResponse?.applied ? 'success' : 'default'}
                        variant={outputsResponse?.applied ? 'filled' : 'outlined'}
                      />
                    </Stack>

                    {outputsResponse?.outputs && Object.keys(outputsResponse.outputs).length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        El backend respondió correctamente, pero no hay outputs guardados para este plan.
                      </Alert>
                    ) : null}

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Resumen de conectividad
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Primero mira estas tres tarjetas. Si necesitas depurar algo puntual, baja luego a los IDs por VPC o TGW.
                      </Typography>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">Modelo</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{connectivityOverview.modeLabel}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                            {describeConnectivityMode(connectivityOverview.modeLabel, connectivityOverview)}
                          </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">Conectividad esperada</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {connectivityOverview.connectedPairs} par(es) conectados
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            <Chip size="small" label={`Peerings activos: ${connectivityOverview.peeringActive}`} variant="outlined" />
                            <Chip size="small" label={`TGW activos: ${connectivityOverview.tgwActive}`} variant="outlined" />
                          </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">Traducción AWS</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {connectivityOverview.tgwAttachmentsActive || connectivityOverview.tgwAttachmentsDeclared} attachment(s) TGW
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                            Declarados: peerings {connectivityOverview.peeringDeclared}, TGW {connectivityOverview.tgwDeclared}.
                          </Typography>
                        </Paper>
                      </Stack>
                    </Box>

                    {vpcInfraCatalog.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Infraestructura destacada por VPC
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Aquí ves solo los identificadores más útiles de cada segmento en AWS.
                        </Typography>
                        <Stack spacing={1.5}>
                          {vpcInfraCatalog.map((item) => (
                            <Paper key={item.logicalVpcId} variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                {item.name}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={`VPC: ${item.actualVpcId || '—'}`} variant="outlined" />
                                <Chip
                                  size="small"
                                  label={item.igwId ? `IGW: ${item.igwId}` : 'IGW: —'}
                                  color={item.igwId ? 'primary' : 'default'}
                                  variant={item.igwId ? 'filled' : 'outlined'}
                                />
                                <Chip
                                  size="small"
                                  label={item.natGatewayId ? `NAT: ${item.natGatewayId}` : 'NAT: —'}
                                  color={item.natGatewayId ? 'secondary' : 'default'}
                                  variant={item.natGatewayId ? 'filled' : 'outlined'}
                                />
                                <Chip
                                  size="small"
                                  label={
                                    item.natEipAllocationId
                                      ? `NAT EIP: ${item.natEipAllocationId}`
                                      : 'NAT EIP: —'
                                  }
                                  color={item.natEipAllocationId ? 'warning' : 'default'}
                                  variant={item.natEipAllocationId ? 'filled' : 'outlined'}
                                />
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {transitGatewayCatalog.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Infraestructura Transit Gateway
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Este bloque solo aparece si el laboratorio usa un hub central de AWS Transit Gateway.
                        </Typography>
                        <Stack spacing={1.5}>
                          {transitGatewayCatalog.map((item) => (
                            <Paper key={item.routerId} variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                {item.name}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: item.attachments.length > 0 ? 1.5 : 0 }}>
                                <Chip size="small" label={`Router lógico: ${item.routerId}`} variant="outlined" />
                                <Chip
                                  size="small"
                                  label={item.tgwId ? `TGW: ${item.tgwId}` : 'TGW: —'}
                                  color={item.tgwId ? 'secondary' : 'default'}
                                  variant={item.tgwId ? 'filled' : 'outlined'}
                                />
                                <Chip
                                  size="small"
                                  label={item.routeTableId ? `TGW RT: ${item.routeTableId}` : 'TGW RT: —'}
                                  color={item.routeTableId ? 'warning' : 'default'}
                                  variant={item.routeTableId ? 'filled' : 'outlined'}
                                />
                              </Stack>

                              {item.attachments.length > 0 && (
                                <Stack spacing={1}>
                                  {item.attachments.map((attachment) => (
                                    <Paper key={attachment.key} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Attachment
                                      </Typography>
                                      <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip size="small" label={`VPC: ${attachment.vpcName}`} variant="outlined" />
                                        <Chip size="small" label={attachment.attachmentId ? `ID: ${attachment.attachmentId}` : 'ID: —'} color={attachment.attachmentId ? 'info' : 'default'} variant={attachment.attachmentId ? 'filled' : 'outlined'} />
                                      </Stack>
                                    </Paper>
                                  ))}
                                </Stack>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: outputsJsonOpen ? 1.5 : 0 }}
                      >
                        <Box>
                          <Typography variant="subtitle2">JSON completo</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Solo si necesitas inspeccionar todos los outputs crudos del backend.
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant={outputsJsonOpen ? 'contained' : 'outlined'}
                          onClick={() => setOutputsJsonOpen((prev) => !prev)}
                        >
                          {outputsJsonOpen ? 'Ocultar JSON' : 'Ver JSON completo'}
                        </Button>
                      </Stack>

                      {outputsJsonOpen && (
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: 'background.default', overflow: 'auto' }}
                        >
                          <Box
                            component="pre"
                            sx={{
                              m: 0,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              fontSize: 12,
                            }}
                          >
                            {JSON.stringify(outputsResponse?.outputs ?? outputsResponse, null, 2)}
                          </Box>
                        </Paper>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          )}

          <AwsOutputsInfoDialog open={outputsInfoOpen} onClose={() => setOutputsInfoOpen(false)} />

          {tab === 'tests' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Guía de pruebas post-deploy</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Define pruebas de conectividad entre VPCs según el modo de enrutamiento desplegado.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? 'Cargando…' : 'Cargar outputs para pruebas'}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setConsoleGuideOpen(true)}
                  disabled={!canOpenConsoleGuide}
                >
                  Cómo probar en consola
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                  Abre el modal de instrucciones para ver el paso a paso por consola: cómo entrar por SSH a una bastion
                  y luego cómo ejecutar los pings entre VPCs.
                </Alert>

                {!hasOutputsData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Carga outputs para identificar instancias/IPs reales y ejecutar pruebas guiadas.
                  </Alert>
                )}

                {connectivityScenarios.length === 0 && (
                  <Alert severity="warning">
                    Este plan no expone pares de VPC conectados por peering o TGW para pruebas cruzadas.
                  </Alert>
                )}

                {connectivityScenarios.map((scenario) => (
                  <Paper key={`${scenario.aId}:${scenario.bId}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {scenario.aVpc.name} ↔ {scenario.bVpc.name}
                      </Typography>
                      <Chip size="small" label={scenario.modeLabel} color="primary" variant="outlined" />
                      <Chip size="small" label={`${scenario.aVpc.cidr} / ${scenario.bVpc.cidr}`} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Routers implicados: {scenario.routers.length > 0 ? scenario.routers.join(', ') : 'n/a'}
                    </Typography>

                    {!scenario.readyForRun && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        No hay suficientes outputs de instancias para generar prueba ida/vuelta en este par.
                      </Alert>
                    )}

                    {scenario.checks.length > 0 && (
                      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                        {scenario.checks.map((check) => (
                          <Box key={`${scenario.aId}:${scenario.bId}:${check.title}`}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {check.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              {check.context}
                            </Typography>
                            <Paper
                              variant="outlined"
                              sx={{ p: 1, bgcolor: 'background.default', overflow: 'auto' }}
                            >
                              <Box
                                component="pre"
                                sx={{
                                  m: 0,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  fontSize: 12,
                                }}
                              >
                                {check.command}
                              </Box>
                            </Paper>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                ))}

                <Alert severity="info" variant="outlined">
                  Resultado esperado: si la topología está correcta, cada par conectado debe responder ping en ida y retorno.
                </Alert>
              </Box>
            </Box>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Logs del plan</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    El log corresponde siempre a la última ejecución (deploy o destroy).
                  </Typography>
                </Box>
                <Button variant="contained" onClick={fetchPlanLogs}>
                  Ver log del plan
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!logText && (
                  <Alert severity="info">
                    Haz clic en “Ver log del plan” para mostrar el log de la última ejecución.
                  </Alert>
                )}

                {logText && (
                  <>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Este log corresponde a la última ejecución del plan.
                    </Alert>
                    {planRiskSummary && (
                      <Alert severity={riskAlertSeverity} sx={{ mb: 1 }}>
                        Resumen Terraform: {planRiskSummary.add} add, {planRiskSummary.change} change, {planRiskSummary.destroy} destroy, {planRiskSummary.replace} replace.
                      </Alert>
                    )}
                    <Paper
                      variant="outlined"
                      sx={{ mt: 2, p: 2, bgcolor: 'background.default', overflow: 'auto' }}
                    >
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 12,
                        }}
                      >
                        {logText}
                      </Box>
                    </Paper>
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* PAYLOAD */}
          {tab === 'payload' && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payload
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, bgcolor: 'background.default', overflow: 'auto' }}
              >
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(plan, null, 2)}
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      </Stack>
      <Dialog
        open={consoleGuideOpen}
        onClose={() => setConsoleGuideOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cómo probar conectividad desde consola</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              Primero entra por SSH a una bastion pública. Después, desde esa instancia, ejecuta ping a las IPs
              privadas sugeridas en esta misma pestaña.
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                1. Requisitos previos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Necesitas `aws` CLI, acceso a la key pair con la que desplegaste la instancia y que tu IP pública esté
                permitida en `Allowed SSH CIDR`.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                2. Bastions detectadas en este laboratorio
              </Typography>
              <Stack spacing={1}>
                {consoleGuide.bastions.map((item) => (
                  <Paper key={`${item.vpcId}:${item.instanceId || item.instanceName}`} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.vpcName}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Instancia: {item.instanceName} · instance_id: {item.instanceId || 'n/a'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      IP pública: {item.publicIp || 'n/a'} · IP privada: {item.privateIp || 'n/a'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Región/AZ: {item.region} / {item.availabilityZone} · Key pair: {item.keyPair}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                3. Si ya tienes el archivo `.pem`, conéctate por SSH
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                  }}
                >
{`chmod 400 ~/.ssh/tesis-key-new.pem
ssh -i ~/.ssh/tesis-key-new.pem ec2-user@${consoleGuide.bastions[0]?.publicIp || 'IP_PUBLICA_BASTION'}`}
                </Box>
              </Paper>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                4. Si no tienes la llave privada, usa EC2 Instance Connect
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                AWS no permite descargar la private key de una key pair existente. En ese caso, puedes inyectar una
                clave pública temporal y entrar con una llave efímera.
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                  }}
                >
{`TMPK=/tmp/eic_lab
ssh-keygen -t ed25519 -N '' -f "$TMPK"

aws ec2-instance-connect send-ssh-public-key \\
  --region ${consoleGuide.region} \\
  --instance-id ${consoleGuide.bastions[0]?.instanceId || 'i-xxxxxxxx'} \\
  --availability-zone ${consoleGuide.bastions[0]?.availabilityZone || 'us-east-1a'} \\
  --instance-os-user ec2-user \\
  --ssh-public-key file://"$TMPK.pub"

ssh -i "$TMPK" ec2-user@${consoleGuide.bastions[0]?.publicIp || 'IP_PUBLICA_BASTION'}`}
                </Box>
              </Paper>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                5. Ejecuta los pings desde la bastion
              </Typography>
              <Stack spacing={1}>
                {consoleGuide.scenarios.flatMap((scenario) =>
                  scenario.checks.map((check) => (
                    <Paper key={`${scenario.aId}:${scenario.bId}:${check.title}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {check.title}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.75 }}>
                        {check.context}
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 12,
                        }}
                      >
                        {check.command}
                      </Box>
                    </Paper>
                  )),
                )}
              </Stack>
            </Box>

            <Alert severity="success" variant="outlined">
              Resultado esperado: cada par conectado debería responder ping en ida y retorno. Si falla, revisa route
              tables, Security Groups, key pair y `Allowed SSH CIDR`.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsoleGuideOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
