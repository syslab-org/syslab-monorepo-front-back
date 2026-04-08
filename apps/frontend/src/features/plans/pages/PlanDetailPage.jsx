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
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';

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

function executionTone(status, lifecycleKey) {
  if (status === 'RUNNING' || status === 'PENDING') {
    return {
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(14,165,233,0.08) 55%, rgba(255,255,255,0.96) 100%)',
      border: 'rgba(59,130,246,0.26)',
      glow: '0 18px 40px rgba(59, 130, 246, 0.14)',
      accent: 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)',
      iconBg: 'rgba(59,130,246,0.10)',
      iconBorder: 'rgba(59,130,246,0.22)',
    };
  }

  if (lifecycleKey === 'ACTIVE') {
    return {
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(45,212,191,0.08) 50%, rgba(255,255,255,0.96) 100%)',
      border: 'rgba(34,197,94,0.24)',
      glow: '0 16px 36px rgba(34, 197, 94, 0.10)',
      accent: 'linear-gradient(180deg, #22c55e 0%, #0f766e 100%)',
      iconBg: 'rgba(34,197,94,0.10)',
      iconBorder: 'rgba(16,185,129,0.22)',
    };
  }

  return {
    gradient: 'linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(241,245,249,0.92) 100%)',
    border: 'rgba(148,163,184,0.22)',
    glow: '0 12px 30px rgba(15, 23, 42, 0.06)',
    accent: 'linear-gradient(180deg, #94a3b8 0%, #64748b 100%)',
    iconBg: 'rgba(148,163,184,0.12)',
    iconBorder: 'rgba(148,163,184,0.22)',
  };
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

function describeExecutionHero(plan, lifecycle, runningPhase) {
  if (plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING) {
    return runningPhase;
  }

  switch (lifecycle.key) {
    case 'ACTIVE':
      return {
        title: 'Infraestructura activa en AWS',
        description:
          'El stack está desplegado y listo para seguir validando, actualizarse con un redeploy o destruirse cuando quieras limpiar el laboratorio.',
      };
    case 'DESTROYED':
      return {
        title: 'Infraestructura eliminada',
        description:
          'El último destroy terminó correctamente. Este plan queda como historial operativo y puedes volver a lanzar un deploy real cuando lo necesites.',
      };
    case 'PREVIEW':
      return {
        title: 'Plan listo para validación',
        description:
          'Todavía no hay infraestructura real en AWS. Puedes seguir revisando el preview o convertirlo en un APPLY real cuando estés conforme.',
      };
    case 'FAILED_REAL_APPLY':
      return {
        title: 'Recuperación recomendada',
        description:
          'El apply real falló y podría haber recursos parciales. La siguiente acción recomendada es limpiar el stack antes de reintentar.',
      };
    case 'NOT_APPLIED':
      return {
        title: 'Listo para primer deploy',
        description:
          'El plan está preparado pero aún no ha sido aplicado en AWS. Puedes lanzar un preview o el primer APPLY real según el caso.',
      };
    default:
      return {
        title: 'Estado operativo del plan',
        description: lifecycle.helper,
      };
  }
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

const executionSourceLabels = {
  lab_explicit: 'Conexión fijada explícitamente en el laboratorio.',
  owner_personal_auto: 'Auto resolverá la cuenta personal del owner del laboratorio.',
  course_shared_auto: 'Auto resolverá la cuenta compartida del curso.',
  unresolved: 'No hay una conexión cloud ejecutable resuelta para este laboratorio.',
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

function buildManagedEgressScenarios(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];
  const instanceCatalog = buildInstanceCatalog(outputs);
  const natGatewayIds = safeObject(outputs?.nat_gateway_ids);
  const natEipAllocationIds = safeObject(outputs?.nat_eip_allocation_ids);

  return vpcs
    .map((vpc) => {
      const subnets = Array.isArray(vpc?.subnets) ? vpc.subnets : [];
      const publicSubnets = subnets.filter(
        (subnet) => String(subnet?.subnet_type || '').toLowerCase() === 'public',
      );
      const privateSubnets = subnets.filter(
        (subnet) => String(subnet?.subnet_type || '').toLowerCase() === 'private',
      );
      const natConfig = safeObject(vpc?.nat_gateway);
      const natEnabled = Boolean(natConfig?.enabled);
      const egressSubnetName = natConfig?.public_subnet || publicSubnets[0]?.name || null;

      if (!natEnabled || publicSubnets.length === 0) {
        return null;
      }

      const publicDeclared = publicSubnets.flatMap((subnet) =>
        Array.isArray(subnet?.instances)
          ? subnet.instances.map((instance) => ({
            ...instance,
            subnetName: subnet.name,
            subnetType: 'public',
          }))
          : [],
      );
      const privateDeclared = privateSubnets.flatMap((subnet) =>
        Array.isArray(subnet?.instances)
          ? subnet.instances.map((instance) => ({
            ...instance,
            subnetName: subnet.name,
            subnetType: 'private',
          }))
          : [],
      );

      const outputInstances = instanceCatalog.get(vpc.id) || [];
      const enrichDeclared = (declared) => {
        const match = outputInstances.find((item) => item.instanceName === declared?.name);
        return {
          instanceName: declared?.name || match?.instanceName || 'instancia',
          instanceId: match?.instanceId || null,
          privateIp: match?.privateIp || declared?.ip_address || null,
          publicIp: match?.publicIp || null,
          subnetName: declared?.subnetName || 'subnet',
          subnetType: declared?.subnetType || 'unknown',
          keyPair: declared?.ssh_access || 'tu-keypair',
        };
      };

      const bastion = publicDeclared[0] ? enrichDeclared(publicDeclared[0]) : null;
      const privateWorkload = privateDeclared[0] ? enrichDeclared(privateDeclared[0]) : null;
      const hasPrivateWorkload = Boolean(privateWorkload?.privateIp);
      const hasPrivateSubnets = privateSubnets.length > 0;

      const checks = [];
      if (bastion?.privateIp && privateWorkload?.privateIp) {
        checks.push({
          title: `Desde ${bastion.instanceName} hacia ${privateWorkload.instanceName}`,
          command: `ping -c 4 ${privateWorkload.privateIp}`,
          context: bastion.publicIp
            ? `Ejecutar dentro de ${bastion.instanceName} (${bastion.publicIp}) para validar alcance privado dentro de la VPC`
            : `Ejecutar dentro de ${bastion.instanceName} (${bastion.instanceId || 'sin instance_id'})`,
        });
      } else if (bastion?.publicIp) {
        checks.push({
          title: `Confirmar acceso SSH a ${bastion.instanceName}`,
          command: `ssh -i ~/.ssh/tesis-key-new.pem ec2-user@${bastion.publicIp}`,
          context:
            'Úsalo para verificar que la instancia pública quedó accesible y contrastar que el NAT existe aunque no haya subnets privadas que lo aprovechen.',
        });
      }

      return {
        type: 'managed-egress',
        vpcId: vpc.id,
        vpcName: vpc.name || vpc.id,
        cidr: vpc.cidr_block || 'CIDR n/a',
        egressSubnetName,
        natGatewayId: natGatewayIds[vpc.id] || null,
        natEipAllocationId: natEipAllocationIds[vpc.id] || null,
        bastion,
        privateWorkload,
        hasPrivateSubnets,
        hasPrivateWorkload,
        checks,
        readyForRun: checks.length > 0,
      };
    })
    .filter(Boolean);
}

function buildPublicAccessScenarios(plan, outputsResponse) {
  const payload = safeObject(plan?.payload);
  const outputs = safeObject(outputsResponse?.outputs);
  const vpcs = Array.isArray(payload?.vpcs) ? payload.vpcs : [];
  const instanceCatalog = buildInstanceCatalog(outputs);

  return vpcs
    .map((vpc) => {
      const subnets = Array.isArray(vpc?.subnets) ? vpc.subnets : [];
      const publicSubnets = subnets.filter(
        (subnet) => String(subnet?.subnet_type || '').toLowerCase() === 'public',
      );
      const outputInstances = instanceCatalog.get(vpc.id) || [];

      const publicDeclared = publicSubnets.flatMap((subnet) =>
        Array.isArray(subnet?.instances)
          ? subnet.instances.map((instance) => ({
            ...instance,
            subnetName: subnet.name,
            availabilityZone: subnet.availability_zone || 'n/a',
          }))
          : [],
      );

      const bastionDeclared = publicDeclared[0] || null;
      const bastionOutput = bastionDeclared
        ? outputInstances.find((item) => item.instanceName === bastionDeclared?.name)
        : outputInstances.find((item) => item.publicIp);
      const bastion = bastionDeclared || bastionOutput
        ? {
          instanceName: bastionDeclared?.name || bastionOutput?.instanceName || 'instancia',
          instanceId: bastionOutput?.instanceId || null,
          publicIp: bastionOutput?.publicIp || null,
          privateIp: bastionOutput?.privateIp || bastionDeclared?.ip_address || null,
          keyPair: bastionDeclared?.ssh_access || 'tu-keypair',
          subnetName: bastionDeclared?.subnetName || publicSubnets[0]?.name || 'subnet-publica',
          availabilityZone: bastionDeclared?.availabilityZone || publicSubnets[0]?.availability_zone || 'n/a',
        }
        : null;

      if (!bastion?.publicIp) {
        return null;
      }

      return {
        type: 'public-access',
        vpcId: vpc.id,
        vpcName: vpc.name || vpc.id,
        cidr: vpc.cidr_block || 'CIDR n/a',
        bastion,
        checks: [
          {
            title: `Confirmar acceso SSH a ${bastion.instanceName}`,
            command: `ssh -i ~/.ssh/${bastion.keyPair}.pem ec2-user@${bastion.publicIp}`,
            context:
              'Úsalo para validar que la instancia pública quedó expuesta correctamente y que tu IP está permitida en Allowed SSH CIDR.',
          },
        ],
        readyForRun: true,
      };
    })
    .filter(Boolean);
}

function buildPostDeployConsoleGuide(
  plan,
  outputsResponse,
  connectivityScenarios,
  managedEgressScenarios,
  publicAccessScenarios,
) {
  const crossVpcGuide = buildConsoleTestGuide(plan, outputsResponse, connectivityScenarios);
  const scenarios = [
    ...crossVpcGuide.scenarios.map((scenario) => ({
      key: `${scenario.aId}:${scenario.bId}`,
      kind: 'cross-vpc',
      title: `${scenario.aVpc.name} ↔ ${scenario.bVpc.name}`,
      checks: scenario.checks,
    })),
    ...managedEgressScenarios.map((scenario) => ({
      key: `${scenario.vpcId}:managed-egress`,
      kind: 'managed-egress',
      title: `${scenario.vpcName} · salida privada con NAT`,
      checks: scenario.checks,
    })),
    ...publicAccessScenarios.map((scenario) => ({
      key: `${scenario.vpcId}:public-access`,
      kind: 'public-access',
      title: `${scenario.vpcName} · acceso público directo`,
      checks: scenario.checks,
    })),
  ];

  return {
    ...crossVpcGuide,
    scenarios,
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
  const [logUpdatedAt, setLogUpdatedAt] = useState(null);
  const [highlightedLogLineStart, setHighlightedLogLineStart] = useState(null);
  const [planRiskSummary, setPlanRiskSummary] = useState(null);
  const [lastDestroyTaskId, setLastDestroyTaskId] = useState(null);
  const [consoleGuideOpen, setConsoleGuideOpen] = useState(false);

  const [msg, setMsg] = useState(null); // { text: string, severity: 'success'|'info'|'warning'|'error' }
  const [err, setErr] = useState(null);

  const timerRef = useRef(null);
  const msgTimerRef = useRef(null);
  const logHighlightTimerRef = useRef(null);
  const prevStatusRef = useRef(null);
  const actionLockRef = useRef(false);
  const logContainerRef = useRef(null);
  const lastLogLineCountRef = useRef(0);

  const isRunning = plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING;

  const lifecycle = useMemo(() => computeLifecycle(plan), [plan]);
  const runningPhase = useMemo(() => describeRunningPhase(plan, lifecycle), [plan, lifecycle]);
  const executionHero = useMemo(
    () => describeExecutionHero(plan, lifecycle, runningPhase),
    [plan, lifecycle, runningPhase],
  );
  const connectivityScenarios = useMemo(
    () => buildConnectivityScenarios(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const managedEgressScenarios = useMemo(
    () => buildManagedEgressScenarios(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const publicAccessScenarios = useMemo(
    () => buildPublicAccessScenarios(plan, outputsResponse),
    [plan, outputsResponse],
  );
  const instanceCatalog = useMemo(
    () => buildInstanceCatalog(outputsResponse?.outputs),
    [outputsResponse],
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
    () =>
      buildPostDeployConsoleGuide(
        plan,
        outputsResponse,
        connectivityScenarios,
        managedEgressScenarios,
        publicAccessScenarios,
      ),
    [plan, outputsResponse, connectivityScenarios, managedEgressScenarios, publicAccessScenarios],
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
  const resolvedExecutionTarget = safeObject(plan?.resolved_execution_target);
  const hasResolvedExecutionTarget = Object.keys(resolvedExecutionTarget).length > 0;
  const lastApplyContext = safeObject(plan?.last_apply_context);
  const hasLastApplyContext = Object.keys(lastApplyContext).length > 0;
  const executionHistory = Array.isArray(plan?.execution_history) ? plan.execution_history : [];
  const cloudTargetState = safeObject(plan?.cloud_target_state);
  const cloudTargetMismatch = Boolean(cloudTargetState?.is_mismatch);
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
  const canApply = Boolean(plan?.can_apply ?? true) && !cloudTargetMismatch;

  // Destroy permitido según regla backend (incluye apply real fallido), y no está corriendo
  const canDestroy =
    !isRunning &&
    Boolean(
      !cloudTargetMismatch &&
      (plan?.can_destroy ??
      (plan?.applied === true &&
        String(plan?.last_action || '').toLowerCase() !== 'destroy')
      )
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

        // Si el usuario está viendo Logs, refrescamos el contenido durante el polling
        // para que el progreso se vea en tiempo real sin requerir clic manual.
        if (tab === 'logs') {
          if (nowRunning || nowTerminal) {
            await fetchPlanLogs();
          }
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
    [id, msg, tab]
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
      setLogUpdatedAt(new Date().toISOString());
      setPlanRiskSummary(parseTerraformPlanSummary(log));
    } catch (e) {
      setLogText(`No se pudo leer el log: ${String(e)}`);
      setLogUpdatedAt(null);
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
      setLogUpdatedAt(resp?.updated_at || null);
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
      setLogUpdatedAt(null);
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
      if (logHighlightTimerRef.current) clearTimeout(logHighlightTimerRef.current);
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

  useEffect(() => {
    if (tab !== 'logs' || !isRunning || !logText || !logContainerRef.current) return;
    const el = logContainerRef.current;
    el.scrollTop = el.scrollHeight;
  }, [logText, isRunning, tab]);

  useEffect(() => {
    const currentLineCount = String(logText || '').split('\n').length;

    if (!logText) {
      lastLogLineCountRef.current = 0;
      setHighlightedLogLineStart(null);
      return;
    }

    const previousLineCount = lastLogLineCountRef.current;
    const hasNewLines = currentLineCount > previousLineCount;

    if (isRunning && hasNewLines && previousLineCount > 0) {
      setHighlightedLogLineStart(previousLineCount);
      if (logHighlightTimerRef.current) clearTimeout(logHighlightTimerRef.current);
      logHighlightTimerRef.current = setTimeout(() => {
        setHighlightedLogLineStart(null);
      }, 3500);
    }

    lastLogLineCountRef.current = currentLineCount;
  }, [logText, isRunning]);

  const handleDeploy = async () => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    if (busy || isRunning) {
      actionLockRef.current = false;
      return;
    }
    if (applyMode && !canApply) {
      if (cloudTargetMismatch) {
        setErr(
          cloudTargetState?.message ||
          'La conexión cloud actual ya no coincide con la usada en el último APPLY real. Revisa la cuenta actual antes de ejecutar infraestructura real.',
        );
        actionLockRef.current = false;
        return;
      }
      setErr(
        'El APPLY real y el Destroy solo están permitidos al owner, al platform admin o al docente cuando la conexión efectiva del laboratorio es course_shared. Puedes seguir usando PLAN para revisión.',
      );
      actionLockRef.current = false;
      return;
    }
    setDeploying(true);
    setMsg(null);
    setErr(null);
    setLogText(null);
    setLogUpdatedAt(null);
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
      if (status === 409 && payload?.code === 'CLOUD_TARGET_CHANGED') {
        setErr(payload?.error || 'La cuenta cloud actual ya no coincide con la usada en el último APPLY real.');
        await fetchPlan();
        return;
      }
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
      if (status === 403 && payload?.code === 'PLAN_EXECUTION_FORBIDDEN') {
        setErr(payload?.error || 'No tienes permiso para ejecutar infraestructura real en este laboratorio.');
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
      if (cloudTargetMismatch) {
        setErr(
          cloudTargetState?.message ||
          'La conexión cloud actual ya no coincide con la usada en el último APPLY real. Destroy real se bloquea para evitar operar en una cuenta equivocada.',
        );
      }
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
    setLogUpdatedAt(null);

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
      if (status === 409 && payload?.code === 'CLOUD_TARGET_CHANGED') {
        setErr(payload?.error || 'La cuenta cloud actual ya no coincide con la usada en el último APPLY real.');
        await fetchPlan();
        return;
      }
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
      if (status === 403 && payload?.code === 'PLAN_EXECUTION_FORBIDDEN') {
        setErr(payload?.error || 'No tienes permiso para destruir infraestructura real en este laboratorio.');
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
    (connectivityScenarios.length > 0 || managedEgressScenarios.length > 0 || publicAccessScenarios.length > 0) &&
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
    : applyMode && !canApply
      ? {
          severity: 'warning',
          text: cloudTargetMismatch
            ? (cloudTargetState?.message || 'La cuenta cloud actual ya no coincide con la usada en el último APPLY real.')
            : 'Este plan es visible para revisión. El APPLY real y el Destroy solo están permitidos al owner, al platform admin o al docente cuando la conexión efectiva es course_shared.',
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

  const tone = executionTone(plan?.status, lifecycle.key);

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
        <Paper
          sx={{
            p: 3,
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${tone.border}`,
            background: tone.gradient,
            boxShadow: tone.glow,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at top right, rgba(255,255,255,0.85) 0%, transparent 34%)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 6,
              background: tone.accent,
            }}
          />
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
          {cloudTargetMismatch && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cloudTargetState?.message || 'La conexión cloud actual ya no coincide con la usada en el último APPLY real.'}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '18px',
                    display: 'grid',
                    placeItems: 'center',
                    background: tone.iconBg,
                    border: `1px solid ${tone.iconBorder}`,
                    color: plan?.status === 'RUNNING' || plan?.status === 'PENDING' ? 'info.main' : lifecycle.key === 'ACTIVE' ? 'success.main' : 'text.secondary',
                    flexShrink: 0,
                  }}
                >
                  {plan?.status === 'RUNNING' || plan?.status === 'PENDING' ? (
                    <AutorenewRoundedIcon />
                  ) : lifecycle.key === 'ACTIVE' ? (
                    <BoltRoundedIcon />
                  ) : (
                    <CloudSyncOutlinedIcon />
                  )}
                </Box>

                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ letterSpacing: '0.14em', opacity: 0.72 }}>
                    Control de ejecución
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.12 }}>
                    {executionHero.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
                    {executionHero.description}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap flexWrap="wrap">
                <Paper variant="outlined" sx={{ px: 1.5, py: 1.1, borderRadius: 3, minWidth: 180, bgcolor: 'rgba(255,255,255,0.66)' }}>
                  <Typography variant="caption" color="text.secondary">Actualizado</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDateTime(plan?.updated_at)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 1.1, borderRadius: 3, minWidth: 160, bgcolor: 'rgba(255,255,255,0.66)' }}>
                  <Typography variant="caption" color="text.secondary">Última acción</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{plan?.last_action || plan?.lastAction || '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 1.1, borderRadius: 3, minWidth: 260, bgcolor: 'rgba(255,255,255,0.66)' }}>
                  <Typography variant="caption" color="text.secondary">Task actual</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    {plan?.task_id || '—'}
                  </Typography>
                </Paper>
              </Stack>

              {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  El canvas cambió: la infraestructura desplegada (si existía) ya no coincide con este plan.
                </Typography>
              )}
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
                  disabled={!canDeploy || busy || (applyMode && !canApply)}
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
                p: 2.25,
                borderColor: tone.border,
                bgcolor: 'rgba(255,255,255,0.72)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
                borderRadius: 4,
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
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '14px',
                        display: 'grid',
                        placeItems: 'center',
                        background: tone.iconBg,
                        border: `1px solid ${tone.iconBorder}`,
                        color: 'info.main',
                      }}
                    >
                      <CircularProgress size={18} color="inherit" />
                    </Box>
                    <Box sx={{ maxWidth: 700 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {runningPhase.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {runningPhase.description}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    color="primary"
                    variant="filled"
                    label="Actualización automática activa"
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <LinearProgress
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: 'rgba(37,99,235,0.10)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                      background: tone.accent,
                    },
                  }}
                />

                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  alignItems={{ md: 'center' }}
                  justifyContent="space-between"
                >
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
                    {runningPhase.nextStep}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      variant="filled"
                      color="default"
                      label={`Task: ${plan?.task_id || 'pendiente'}`}
                      sx={{ bgcolor: 'rgba(255,255,255,0.84)' }}
                    />
                    <Chip
                      size="small"
                      variant="filled"
                      color="default"
                      label={`Última acción: ${plan?.last_action || plan?.lastAction || '—'}`}
                      sx={{ bgcolor: 'rgba(255,255,255,0.84)' }}
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
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 4,
                  borderColor: tone.border,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.98) 100%)',
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      Estado del plan
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lectura rápida del resultado reciente y del estado operativo actual.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" {...statusChipProps(plan?.status)} />
                    <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />
                  </Stack>
                </Stack>
              </Paper>

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
                  Próxima ejecución real
                </Typography>
                {!hasResolvedExecutionTarget || resolvedExecutionTarget.status === 'missing' ? (
                  <Alert severity="warning" variant="outlined">
                    {executionSourceLabels[resolvedExecutionTarget.source] || executionSourceLabels.unresolved}
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`Provider: ${resolvedExecutionTarget.provider || '—'}`} variant="outlined" />
                      <Chip size="small" label={`Source: ${resolvedExecutionTarget.source || '—'}`} color="info" variant="outlined" />
                      {resolvedExecutionTarget.scope && (
                        <Chip size="small" label={`Scope: ${resolvedExecutionTarget.scope}`} variant="outlined" />
                      )}
                      {resolvedExecutionTarget.default_region && (
                        <Chip size="small" label={`Region: ${resolvedExecutionTarget.default_region}`} variant="outlined" />
                      )}
                    </Stack>
                    <Typography component="div" variant="body2" color="text.secondary">
                      Conexión efectiva:{' '}
                      <b>{resolvedExecutionTarget.name || '—'}</b>
                      {resolvedExecutionTarget.id ? ` (${resolvedExecutionTarget.id})` : ''}
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      {executionSourceLabels[resolvedExecutionTarget.source] || executionSourceLabels.unresolved}
                    </Typography>
                    {resolvedExecutionTarget.account_id && (
                      <Typography component="div" variant="body2" color="text.secondary">
                        Cuenta AWS prevista:{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {resolvedExecutionTarget.account_id}
                        </Box>
                      </Typography>
                    )}
                    {resolvedExecutionTarget.arn && (
                      <Typography component="div" variant="body2" color="text.secondary">
                        ARN conocido:{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {resolvedExecutionTarget.arn}
                        </Box>
                      </Typography>
                    )}
                    {!resolvedExecutionTarget.account_id && (
                      <Alert severity="info" variant="outlined">
                        La conexión está resuelta, pero aún no tenemos identidad STS visible. Usa “Probar” en Cloud Connections para registrar cuenta y ARN.
                      </Alert>
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Reconciliación de cuenta cloud
                </Typography>
                <Alert
                  severity={cloudTargetMismatch ? 'warning' : 'success'}
                  variant="outlined"
                >
                  {cloudTargetState?.message || 'Sin información suficiente para reconciliar la cuenta cloud.'}
                </Alert>
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Evidencia del último APPLY real
                </Typography>
                {!hasLastApplyContext ? (
                  <Alert severity="info" variant="outlined">
                    Aún no hay snapshot de ejecución real guardado para este plan. Aparecerá después del primer APPLY real.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`Provider: ${lastApplyContext.provider || '—'}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={`Source: ${lastApplyContext.credential_source || '—'}`}
                        color={lastApplyContext.credential_source === 'cloud_connection' ? 'success' : 'default'}
                        variant={lastApplyContext.credential_source === 'cloud_connection' ? 'filled' : 'outlined'}
                      />
                      <Chip size="small" label={`Region: ${lastApplyContext.region || '—'}`} variant="outlined" />
                      {lastApplyContext.cloud_connection_scope && (
                        <Chip size="small" label={`Scope: ${lastApplyContext.cloud_connection_scope}`} variant="outlined" />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography component="div" variant="body2" color="text.secondary">
                        Conexión usada:{' '}
                        <b>{lastApplyContext.cloud_connection_name || 'Credenciales del entorno'}</b>
                        {lastApplyContext.cloud_connection_id ? ` (${lastApplyContext.cloud_connection_id})` : ''}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        Cuenta AWS:{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.account_id || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        ARN:{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.arn || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        UserId STS:{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.user_id || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        Capturado:{' '}
                        <b>{formatDateTime(lastApplyContext.captured_at)}</b>
                      </Typography>
                    </Stack>

                    {lastApplyContext.identity_error && (
                      <Alert severity="warning" variant="outlined">
                        No se pudo resolver STS al capturar la auditoría: {lastApplyContext.identity_error}
                      </Alert>
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Historial reciente de ejecuciones
                </Typography>
                {executionHistory.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    Aún no hay ejecuciones registradas para este plan.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {executionHistory.map((item) => (
                      <Paper
                        key={item.id}
                        variant="outlined"
                        sx={{ p: 1.5, bgcolor: 'background.default' }}
                      >
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip size="small" label={(item.action || '—').toUpperCase()} variant="outlined" />
                            <Chip size="small" label={item.status || '—'} {...statusChipProps(String(item.status || '').toUpperCase())} />
                            <Chip
                              size="small"
                              label={item.simulate_only ? 'PREVIEW' : 'REAL'}
                              color={item.simulate_only ? 'info' : 'success'}
                              variant={item.simulate_only ? 'outlined' : 'filled'}
                            />
                            {item.cloud_connection_scope && (
                              <Chip size="small" label={`Scope: ${item.cloud_connection_scope}`} variant="outlined" />
                            )}
                          </Stack>
                          <Typography component="div" variant="body2" color="text.secondary">
                            Solicitado por:{' '}
                            <b>{item.requested_by?.display_name || item.requested_by?.email || '—'}</b>
                            {item.delegation_id ? ` · delegación ${item.delegation_id}` : ''}
                          </Typography>
                          <Typography component="div" variant="body2" color="text.secondary">
                            Conexión:{' '}
                            <b>{item.cloud_connection_name || 'Credenciales del entorno'}</b>
                            {item.resolved_execution_source ? ` · source ${item.resolved_execution_source}` : ''}
                          </Typography>
                          {(item.account_id || item.arn) && (
                            <Typography component="div" variant="body2" color="text.secondary">
                              Identidad:{' '}
                              <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {item.account_id || '—'}
                                {item.arn ? ` · ${item.arn}` : ''}
                              </Box>
                            </Typography>
                          )}
                          <Typography component="div" variant="body2" color="text.secondary">
                            Inicio: <b>{formatDateTime(item.started_at || item.created_at)}</b>
                            {item.completed_at ? ` · Fin: ${formatDateTime(item.completed_at)}` : ''}
                          </Typography>
                          {item.error && (
                            <Alert severity="warning" variant="outlined">
                              {item.error}
                            </Alert>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
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

                              {(instanceCatalog.get(item.logicalVpcId) || []).length > 0 && (
                                <Stack spacing={1} sx={{ mt: 1.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Instancias detectadas
                                  </Typography>
                                  {(instanceCatalog.get(item.logicalVpcId) || []).map((instance) => (
                                    <Paper
                                      key={instance.key}
                                      variant="outlined"
                                      sx={{ p: 1.5, bgcolor: 'background.default' }}
                                    >
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {instance.instanceName}
                                      </Typography>
                                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                        <Chip
                                          size="small"
                                          label={`ID: ${instance.instanceId || '—'}`}
                                          variant="outlined"
                                        />
                                        <Chip
                                          size="small"
                                          label={`Privada: ${instance.privateIp || '—'}`}
                                          color={instance.privateIp ? 'info' : 'default'}
                                          variant={instance.privateIp ? 'filled' : 'outlined'}
                                        />
                                        <Chip
                                          size="small"
                                          label={`Pública: ${instance.publicIp || '—'}`}
                                          color={instance.publicIp ? 'success' : 'default'}
                                          variant={instance.publicIp ? 'filled' : 'outlined'}
                                        />
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
                    Define pruebas de conectividad entre VPCs, validaciones guiadas para una VPC con NAT o comprobaciones
                    básicas de acceso directo a una bastion pública.
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
                  y luego cómo ejecutar los comandos sugeridos, ya sea entre VPCs, dentro de una VPC con NAT o en un
                  laboratorio single-VPC con exposición pública directa.
                </Alert>

                {!hasOutputsData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Carga outputs para identificar instancias/IPs reales y ejecutar pruebas guiadas.
                  </Alert>
                )}

                {connectivityScenarios.length === 0 && managedEgressScenarios.length === 0 && publicAccessScenarios.length === 0 && (
                  <Alert severity="warning">
                    Este plan no expone pares de VPC conectados por peering/TGW, un caso single-VPC con NAT ni una
                    bastion pública con salida directa que podamos guiar desde aquí.
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

                {managedEgressScenarios.map((scenario) => (
                  <Paper key={`${scenario.vpcId}:managed-egress`} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {scenario.vpcName} · {scenario.hasPrivateSubnets ? 'salida privada con NAT' : 'NAT sin zonas privadas'}
                      </Typography>
                      <Chip size="small" label="Single VPC" variant="outlined" />
                      <Chip size="small" label="Managed egress" color="info" variant="outlined" />
                      <Chip size="small" label={scenario.cidr} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      NAT en zona pública: {scenario.egressSubnetName || 'n/a'} · NAT ID: {scenario.natGatewayId || 'n/a'}
                    </Typography>

                    {!scenario.readyForRun && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        Faltan outputs de bastion o workload privada para generar el comando sugerido.
                      </Alert>
                    )}

                    {scenario.checks.length > 0 && (
                      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                        {scenario.checks.map((check) => (
                          <Box key={`${scenario.vpcId}:${check.title}`}>
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

                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <Alert severity="info" variant="outlined">
                        Qué observar: la bastion pública debería tener IP pública{scenario.hasPrivateWorkload ? ' y la workload privada no.' : '.'}
                      </Alert>
                      {scenario.hasPrivateWorkload ? (
                        <>
                          <Alert severity="info" variant="outlined">
                            Qué observar: la bastion debe alcanzar la IP privada de la workload dentro de la misma VPC.
                          </Alert>
                          <Alert severity="info" variant="outlined">
                            Qué observar: el NAT da salida a la subnet privada, pero no vuelve pública a la workload.
                          </Alert>
                        </>
                      ) : (
                        <>
                          <Alert severity="warning" variant="outlined">
                            Qué observar: el NAT fue creado correctamente, pero en este diseño no hay subnets privadas que lo aprovechen.
                          </Alert>
                          <Alert severity="info" variant="outlined">
                            Qué observar: este caso sirve para enseñar costo/beneficio. El segmento sigue funcionando, pero el NAT aquí agrega complejidad sin aportar aislamiento privado.
                          </Alert>
                        </>
                      )}
                    </Stack>
                  </Paper>
                ))}

                {publicAccessScenarios.map((scenario) => (
                  <Paper key={`${scenario.vpcId}:public-access`} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {scenario.vpcName} · acceso público directo
                      </Typography>
                      <Chip size="small" label="Single VPC" variant="outlined" />
                      <Chip size="small" label="Public bastion" color="success" variant="outlined" />
                      <Chip size="small" label={scenario.cidr} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Bastion: {scenario.bastion.instanceName} · IP pública: {scenario.bastion.publicIp || 'n/a'}
                    </Typography>

                    <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                      {scenario.checks.map((check) => (
                        <Box key={`${scenario.vpcId}:${check.title}`}>
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

                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <Alert severity="info" variant="outlined">
                        Qué observar: la bastion debería aceptar SSH solo desde el rango definido en `Allowed SSH CIDR`.
                      </Alert>
                      <Alert severity="warning" variant="outlined">
                        Qué observar: este diseño expone una instancia directamente a Internet. Es útil para una prueba
                        rápida, pero ofrece menos aislamiento que un patrón con workload privada.
                      </Alert>
                    </Stack>
                  </Paper>
                ))}

                <Alert severity="info" variant="outlined">
                  Resultado esperado: cada par conectado debe responder ping en ida y retorno; en un caso single-VPC con
                  NAT, la bastion debe alcanzar la workload privada y esta última debe permanecer sin IP pública. En un
                  caso con bastion pública directa, la validación mínima es confirmar acceso SSH y entender que el
                  aislamiento es menor que en un patrón con subnet privada.
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
                {isRunning && (
                  <Chip
                    size="small"
                    color="info"
                    variant="filled"
                    label="Streaming activo"
                  />
                )}
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
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Última actualización del log:{' '}
                        <b>{logUpdatedAt ? formatDateTime(logUpdatedAt) : '—'}</b>
                      </Typography>
                      {isRunning && (
                        <Typography variant="caption" color="info.main">
                          El visor baja automáticamente al final mientras la ejecución sigue activa.
                        </Typography>
                      )}
                    </Stack>
                    {planRiskSummary && (
                      <Alert severity={riskAlertSeverity} sx={{ mb: 1 }}>
                        Resumen Terraform: {planRiskSummary.add} add, {planRiskSummary.change} change, {planRiskSummary.destroy} destroy, {planRiskSummary.replace} replace.
                      </Alert>
                    )}
                    {highlightedLogLineStart !== null && (
                      <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
                        Se resaltan las líneas nuevas recién agregadas al log.
                      </Alert>
                    )}
                    <Paper
                      variant="outlined"
                      ref={logContainerRef}
                      sx={{ mt: 2, p: 2, bgcolor: 'background.default', overflow: 'auto', maxHeight: 560 }}
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
                        {String(logText)
                          .split('\n')
                          .map((line, index, lines) => {
                            const isNewLine =
                              highlightedLogLineStart !== null && index >= highlightedLogLineStart;
                            return (
                              <Box
                                key={`${index}-${line}`}
                                component="span"
                                sx={{
                                  display: 'block',
                                  px: 0.5,
                                  mx: -0.5,
                                  borderRadius: 0.5,
                                  bgcolor: isNewLine ? 'success.50' : 'transparent',
                                  transition: 'background-color 300ms ease',
                                }}
                              >
                                {line}
                                {index < lines.length - 1 ? '\n' : ''}
                              </Box>
                            );
                          })}
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
              Primero entra por SSH a una bastion pública. Después, desde esa instancia, ejecuta los comandos sugeridos
              en esta misma pestaña para validar conectividad cruzada entre VPCs o alcance privado dentro de una VPC con NAT.
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
                5. Ejecuta las comprobaciones desde la bastion
              </Typography>
              <Stack spacing={1}>
                {consoleGuide.scenarios.flatMap((scenario) =>
                  scenario.checks.map((check) => (
                    <Paper key={`${scenario.key}:${check.title}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {scenario.title}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.25 }}>
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
              Resultado esperado: cada par conectado debería responder ping en ida y retorno. En un laboratorio con NAT,
              la bastion debe alcanzar la workload privada y esta no debería tener IP pública. Si el laboratorio solo
              tiene zona pública, la comprobación útil es confirmar acceso a la bastion y entender que el NAT quedó
              desplegado pero no está aportando salida a una subnet privada. Si algo falla, revisa route tables,
              Security Groups, key pair y `Allowed SSH CIDR`.
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
