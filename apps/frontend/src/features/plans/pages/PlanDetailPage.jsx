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
import { useTranslation } from 'react-i18next';

import { TASK_STATE_PENDING, TASK_STATE_RUNNING } from '@/shared/constants';
import { api } from '@/infrastructure/http/api';
import { parseTerraformPlanSummary } from '@/features/plans/utils/parseTerraformPlanSummary';
import TourLauncherButton from '@/shared/ui/onboarding/TourLauncherButton';
import useOnboardingTour from '@/shared/ui/onboarding/useOnboardingTour';
import { translate as tr } from '@/shared/i18n';

const POLL_MS = 2000;
const AUTO_DESTROY_WATCH_MS = 10000;

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

function hasScheduledAutoDestroy(plan) {
  if (!plan) return false;
  const autoDestroyAt = plan?.auto_destroy_at || plan?.autoDestroyAt;
  if (!autoDestroyAt) return false;
  const lastAction = String(plan?.last_action || plan?.lastAction || '').toLowerCase();
  return plan?.applied === true && lastAction !== 'destroy';
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
      helper: tr('plans.detail.lifecycleHelper.destroying'),
      chip: { variant: 'filled', color: 'warning' },
      allowDestroy: false,
    };
  }

  if (isRunning && lastAction === 'apply') {
    return {
      key: 'DEPLOYING',
      label: 'DEPLOYING',
      helper: tr('plans.detail.lifecycleHelper.deploying'),
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
        ? tr('plans.detail.lifecycleHelper.activePreview')
        : tr('plans.detail.lifecycleHelper.active'),
      chip: { variant: 'filled', color: 'success' },
      allowDestroy: true,
    };
  }

  // 2️⃣ DESTROYED
  if (isDestroyed) {
    return {
      key: 'DESTROYED',
      label: 'DESTROYED',
      helper: tr('plans.detail.lifecycleHelper.destroyed'),
      chip: { variant: 'outlined', color: 'default' },
      allowDestroy: false,
    };
  }

  // 3️⃣ PREVIEW (solo si NO hay infra real)
  if (simulateOnly) {
    return {
      key: 'PREVIEW',
      label: 'PREVIEW',
      helper: tr('plans.detail.lifecycleHelper.preview'),
      chip: { variant: 'outlined', color: 'info' },
      allowDestroy: false,
    };
  }

  // 4️⃣ FAILED REAL APPLY (puede haber recursos parciales)
  if (failedRealApply) {
    return {
      key: 'FAILED_REAL_APPLY',
      label: 'RECOVERY',
      helper: tr('plans.detail.lifecycleHelper.recovery'),
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
        ? tr('plans.detail.lifecycleHelper.notAppliedCanvas')
        : tr('plans.detail.lifecycleHelper.notApplied'),
    chip: { variant: 'outlined', color: 'warning' },
    allowDestroy: false,
  };
}

function statusChipProps(status) {
  switch (status) {
    case 'SUCCESS':
      return { label: tr('plans.status.success'), color: 'success', variant: 'filled' };
    case 'FAILURE':
      return { label: tr('plans.status.failure'), color: 'error', variant: 'filled' };
    case 'RUNNING':
      return { label: tr('plans.status.running'), color: 'info', variant: 'filled' };
    case 'PENDING':
      return { label: tr('plans.status.pending'), color: 'warning', variant: 'filled' };
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
      title: tr('plans.detail.runningPhase.applyTitle'),
      description: tr('plans.detail.runningPhase.applyDescription'),
      nextStep: tr('plans.detail.runningPhase.applyNext'),
    };
  }

  if (lastAction === 'destroy') {
    return {
      title: tr('plans.detail.runningPhase.destroyTitle'),
      description: tr('plans.detail.runningPhase.destroyDescription'),
      nextStep: tr('plans.detail.runningPhase.destroyNext'),
    };
  }

  if (lastAction === 'plan') {
    return {
      title: tr('plans.detail.runningPhase.planTitle'),
      description: tr('plans.detail.runningPhase.planDescription'),
      nextStep: tr('plans.detail.runningPhase.planNext'),
    };
  }

  return {
    title:
      lifecycle.key === 'DEPLOYING'
        ? tr('plans.detail.runningPhase.genericDeployTitle')
        : tr('plans.detail.runningPhase.genericTitle'),
    description: tr('plans.detail.runningPhase.genericDescription'),
    nextStep: tr('plans.detail.runningPhase.genericNext'),
  };
}

function describeExecutionHero(plan, lifecycle, runningPhase) {
  if (plan?.status === TASK_STATE_RUNNING || plan?.status === TASK_STATE_PENDING) {
    return runningPhase;
  }

  switch (lifecycle.key) {
    case 'ACTIVE':
      return {
        title: tr('plans.detail.hero.activeTitle'),
        description: tr('plans.detail.hero.activeDescription'),
      };
    case 'DESTROYED':
      return {
        title: tr('plans.detail.hero.destroyedTitle'),
        description: tr('plans.detail.hero.destroyedDescription'),
      };
    case 'PREVIEW':
      return {
        title: tr('plans.detail.hero.previewTitle'),
        description: tr('plans.detail.hero.previewDescription'),
      };
    case 'FAILED_REAL_APPLY':
      return {
        title: tr('plans.detail.hero.recoveryTitle'),
        description: tr('plans.detail.hero.recoveryDescription'),
      };
    case 'NOT_APPLIED':
      return {
        title: tr('plans.detail.hero.firstDeployTitle'),
        description: tr('plans.detail.hero.firstDeployDescription'),
      };
    default:
      return {
        title: tr('plans.detail.hero.defaultTitle'),
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
  lab_explicit: tr('labs.executionSourceLabels.lab_explicit'),
  owner_personal_auto: tr('labs.executionSourceLabels.owner_personal_auto'),
  course_shared_auto: tr('labs.executionSourceLabels.course_shared_auto'),
  environment: tr('labs.executionSourceLabels.environment'),
  unresolved: tr('labs.executionSourceLabels.unresolved'),
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

  let modeKey = 'isolated';
  if (tgwDeclared > 0 || tgwActive > 0 || tgwAttachmentsDeclared > 0 || tgwAttachmentsActive > 0) {
    modeKey = 'transitGateway';
  } else if (peeringDeclared > 0 || peeringActive > 0) {
    modeKey = 'peering';
  }

  return {
    modeKey,
    connectedPairs: connectivityScenarios.length,
    peeringDeclared,
    peeringActive,
    tgwDeclared,
    tgwActive,
    tgwAttachmentsDeclared,
    tgwAttachmentsActive,
  };
}

function describeConnectivityMode(modeKey, overview) {
  if (modeKey === 'transitGateway') {
    return tr('plans.detail.outputs.modeDescriptions.transitGateway', {
      count: overview.tgwActive,
    });
  }
  if (modeKey === 'peering') {
    return tr('plans.detail.outputs.modeDescriptions.peering', {
      count: overview.peeringActive,
    });
  }
  return tr('plans.detail.outputs.modeDescriptions.isolated');
}

function AwsOutputsInfoDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{tr('plans.detail.guide.awsTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            {tr('plans.detail.outputs.awsInfoIntro')}
          </Alert>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {tr('plans.detail.guide.connectivityTitle')}
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideConnectivity.mode')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideConnectivity.expectedPairs')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideConnectivity.peerings')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideConnectivity.tgws')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideConnectivity.attachments')}</Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {tr('plans.detail.guide.vpcInfraTitle')}
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideVpc.vpc')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideVpc.igw')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideVpc.nat')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideVpc.natEip')}</Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {tr('plans.detail.guide.tgwInfraTitle')}
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideTgw.logicalRouter')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideTgw.tgw')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideTgw.routeTable')}</Typography>
              <Typography variant="body2">{tr('plans.detail.outputs.awsGuideTgw.attachment')}</Typography>
            </Stack>
          </Box>

          <Alert severity="warning" variant="outlined">
            {tr('plans.detail.guide.practicalRule')}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tr('actions.close')}</Button>
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
      text: tr('plans.detail.summary.advisoriesText.realApply'),
    });
  } else if (lifecycle.key === 'PREVIEW' || lifecycle.key === 'NOT_APPLIED') {
    costs.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.preview'),
    });
  } else if (lifecycle.key === 'DESTROYED') {
    costs.push({
      severity: 'success',
      text: tr('plans.detail.summary.advisoriesText.destroyed'),
    });
  }

  if (instanceCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: tr('plans.detail.summary.advisoriesText.instances', { count: instanceCount }),
    });
  }
  if (natCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: tr('plans.detail.summary.advisoriesText.nat', { count: natCount }),
    });
  }
  if (publicIpv4InUse > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: tr('plans.detail.summary.advisoriesText.publicIpv4', { count: publicIpv4InUse }),
    });
  }
  if (tgwCount > 0 || tgwAttachmentCount > 0) {
    costs.push({
      severity: lifecycle.key === 'ACTIVE' ? 'warning' : 'info',
      text: tr('plans.detail.summary.advisoriesText.tgw', {
        routers: tgwCount,
        attachments: tgwAttachmentCount,
      }),
    });
  }
  if (peeringCount > 0) {
    costs.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.peering', { count: peeringCount }),
    });
  }
  costs.push({
    severity: 'info',
    text: tr('plans.detail.summary.advisoriesText.vpcBase'),
  });

  const residuals = [];
  if (providedNatEips.length > 0) {
    residuals.push({
      severity: 'warning',
      text: tr('plans.detail.summary.advisoriesText.providedEips', { count: providedNatEips.length }),
    });
  } else if (natCount > 0) {
    residuals.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.autoEip'),
    });
  }
  residuals.push({
    severity: 'info',
    text: tr('plans.detail.summary.advisoriesText.outputsHistorical'),
  });
  residuals.push({
    severity: 'info',
    text: tr('plans.detail.summary.advisoriesText.dhcpDefault'),
  });
  if (lifecycle.key === 'FAILED_REAL_APPLY') {
    residuals.push({
      severity: 'warning',
      text: tr('plans.detail.summary.advisoriesText.failedApply'),
    });
  }

  const pedagogy = [];
  if (natCount > 0 && privateSubnetCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.natPrivate'),
    });
  }
  if (publicSubnetCount > 0 && privateSubnetCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.publicPrivateMix', {
        publicCount: publicSubnetCount,
        privateCount: privateSubnetCount,
      }),
    });
  }
  if (providedNatEips.length > 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.fixedEip'),
    });
  }
  if (peeringCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.peeringLearning'),
    });
  }
  if (tgwCount > 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.tgwLearning'),
    });
  }
  if (instanceCount === 0) {
    pedagogy.push({
      severity: 'info',
      text: tr('plans.detail.summary.advisoriesText.noInstances'),
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
    const modeKey =
      modeNames.length === 0
        ? 'none'
        : modeNames.length > 1
          ? 'mixed'
          : modeNames[0] === 'tgw'
            ? 'transitGateway'
            : 'peering';

    const checks = [];
    if (src?.privateIp && dst?.privateIp) {
      checks.push({
        title: tr('plans.detail.tests.forwardCheckTitle', {
          from: aVpc.name,
          to: bVpc.name,
        }),
        command: `ping -c 4 ${dst.privateIp}`,
        context: src.publicIp
          ? tr('plans.detail.tests.runInsidePublic', {
            name: src.instanceName,
            value: src.publicIp,
          })
          : tr('plans.detail.tests.runInsideInstance', {
            name: src.instanceName,
            value: src.instanceId || 'sin instance_id',
          }),
      });
    }
    if (reverseSrc?.privateIp && reverseDst?.privateIp) {
      checks.push({
        title: tr('plans.detail.tests.returnCheckTitle', {
          from: bVpc.name,
          to: aVpc.name,
        }),
        command: `ping -c 4 ${reverseDst.privateIp}`,
        context: reverseSrc.publicIp
          ? tr('plans.detail.tests.runInsidePublic', {
            name: reverseSrc.instanceName,
            value: reverseSrc.publicIp,
          })
          : tr('plans.detail.tests.runInsideInstance', {
            name: reverseSrc.instanceName,
            value: reverseSrc.instanceId || 'sin instance_id',
          }),
      });
    }

    return {
      ...pair,
      aVpc,
      bVpc,
      modeKey,
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
          title: tr('plans.detail.tests.bastionToWorkloadTitle', {
            bastion: bastion.instanceName,
            workload: privateWorkload.instanceName,
          }),
          command: `ping -c 4 ${privateWorkload.privateIp}`,
          context: bastion.publicIp
            ? tr('plans.detail.tests.runInsidePublicVpc', {
              name: bastion.instanceName,
              value: bastion.publicIp,
            })
            : tr('plans.detail.tests.runInsideInstance', {
              name: bastion.instanceName,
              value: bastion.instanceId || 'sin instance_id',
            }),
        });
      } else if (bastion?.publicIp) {
        checks.push({
          title: tr('plans.detail.tests.confirmSshTitle', {
            name: bastion.instanceName,
          }),
          command: `ssh -i ~/.ssh/<tu-clave-privada> ec2-user@${bastion.publicIp}`,
          context: tr('plans.detail.tests.confirmSshContext'),
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
            title: tr('plans.detail.tests.confirmSshTitle', {
              name: bastion.instanceName,
            }),
            command: `ssh -i ~/.ssh/<tu-clave-privada> ec2-user@${bastion.publicIp}`,
            context: tr('plans.detail.tests.publicSshContext', {
              keyPair: bastion.keyPair,
            }),
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
      title: tr('plans.detail.tests.managedEgressTitle', { name: scenario.vpcName }),
      checks: scenario.checks,
    })),
    ...publicAccessScenarios.map((scenario) => ({
      key: `${scenario.vpcId}:public-access`,
      kind: 'public-access',
      title: tr('plans.detail.tests.publicAccessTitle', { name: scenario.vpcName }),
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
  const { startTourIfNeeded, restartTour } = useOnboardingTour();
  const { t } = useTranslation();

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
  const prevTaskIdRef = useRef(null);
  const planRef = useRef(null);
  const msgRef = useRef(null);
  const tabRef = useRef('summary');
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
  const labNotes = String(plan?.lab?.notes || '').trim();
  const resolvedExecutionTarget = safeObject(plan?.resolved_execution_target);
  const hasResolvedExecutionTarget = Object.keys(resolvedExecutionTarget).length > 0;
  const lastApplyContext = safeObject(plan?.last_apply_context);
  const hasLastApplyContext = Object.keys(lastApplyContext).length > 0;
  const executionHistory = Array.isArray(plan?.execution_history) ? plan.execution_history : [];
  const cloudTargetState = safeObject(plan?.cloud_target_state);
  const cloudTargetMismatch = Boolean(cloudTargetState?.is_mismatch);
  const autoDestroyScheduled = hasScheduledAutoDestroy(plan);
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
        const previousTaskId = prevTaskIdRef.current || '';
        const currentMsg = msgRef.current;

        const data = await api.getPlan(id);
        setPlan(data);
        planRef.current = data;
        setLoading(false);

        const nowStatus = data?.status;
        const nowLastAction = String(data?.last_action || data?.lastAction || '').toLowerCase();
        const nowTerminal = nowStatus === 'SUCCESS' || nowStatus === 'FAILURE';
        const wasRunning = prevStatus === TASK_STATE_RUNNING || prevStatus === TASK_STATE_PENDING;

        const nowRunning = nowStatus === TASK_STATE_RUNNING || nowStatus === TASK_STATE_PENDING;
        const shouldWatchAutoDestroy = hasScheduledAutoDestroy(data);
        const currentTaskId = data?.task_id || '';
        const autoDestroyJustStarted =
          nowRunning &&
          nowLastAction === 'destroy' &&
          (!wasRunning || previousTaskId !== currentTaskId);

        // Si el plan está corriendo y no hay mensaje activo, muestra uno único (evita duplicados)
        if (
          autoDestroyJustStarted &&
          !(typeof currentMsg === 'object' && currentMsg?.meta === 'started')
        ) {
          setMsg({
            meta: 'auto-destroy-started',
            severity: 'warning',
            text: t('plans.detail.autoDestroyStarted', {
              task: data?.task_id ? ` task_id=${data.task_id}` : '',
            }),
          });
        } else if (nowRunning && !currentMsg) {
          setMsg({
            severity: 'info',
            text: t('plans.detail.runningConflict') + (data?.task_id ? ` (task_id=${data.task_id})` : ''),
          });
        }

        // Si inició una acción y el usuario recarga la página mientras estaba RUNNING,
        // igual queremos limpiar el banner “iniciado” cuando detectemos estado terminal.
        const msgLooksLikeStarted =
          typeof currentMsg === 'object' &&
          currentMsg?.meta === 'started';

        if ((wasRunning && nowTerminal) || (msgLooksLikeStarted && nowTerminal)) {
          const terminalSeverity = nowStatus === 'SUCCESS' ? 'success' : 'error';
          setMsg({
            meta: 'terminal',
            severity: terminalSeverity,
            text: t('plans.detail.finishedStatus', {
              status: nowStatus,
              error: nowStatus === 'FAILURE' && data?.error ? ` — ${data.error}` : '',
            }),
          });
        }

        // Si el usuario está viendo Logs, refrescamos el contenido durante el polling
        // para que el progreso se vea en tiempo real sin requerir clic manual.
        if (tabRef.current === 'logs') {
          if (nowRunning || nowTerminal) {
            await fetchPlanLogs();
          }
        }

        // Actualiza el prevStatus para el próximo poll
        prevStatusRef.current = nowStatus;
        prevTaskIdRef.current = currentTaskId;

        // Poll mientras corre o mientras exista un auto-destroy programado.
        if (nowRunning || shouldWatchAutoDestroy) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(
            () => fetchPlan(),
            nowRunning ? POLL_MS : AUTO_DESTROY_WATCH_MS,
          );
        }
      } catch (e) {
        setLoading(false);
        setErr(t('plans.list.loadingError') + `: ${e?.message || String(e)}`);
        // eslint-disable-next-line no-console
        console.error(e);
      }
    },
    // OJO: incluimos `id` y `msg` porque usamos ambos para decidir si limpiar el banner.
    // No incluimos `plan` para evitar estados viejos.
    [id, t]
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
      const errorText = backendMsg || e?.message || String(e);
      setErr(t('plans.detail.outputsLoadError', { error: errorText }));
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
      setLogText(t('plans.detail.logReadError', { error: String(e) }));
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
      if (planRef.current?.task_id) {
        await fetchTaskLog(planRef.current.task_id);
        return;
      }
      const backendMsg = e?.response?.data?.error || e?.response?.data?.detail;
      const errorText = backendMsg || e?.message || String(e);
      setErr(t('plans.detail.logsLoadError', { error: errorText }));
      setLogUpdatedAt(null);
      setPlanRiskSummary(null);
    }
  }

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  useEffect(() => {
    msgRef.current = msg;
  }, [msg]);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    // reset de prevStatus cuando cambia el id
    prevStatusRef.current = null;
    prevTaskIdRef.current = null;
    planRef.current = null;
    fetchPlan({ resetLoading: true });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (logHighlightTimerRef.current) clearTimeout(logHighlightTimerRef.current);
    };
  }, [fetchPlan, id]);

  useEffect(() => {
    if (loading || !plan) return;
    startTourIfNeeded('plan-detail-overview');
  }, [loading, plan, startTourIfNeeded]);

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
      msg && typeof msg === 'object' && msg.meta === 'terminal';

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
          t('plans.detail.cloudMismatchApply'),
        );
        actionLockRef.current = false;
        return;
      }
      setErr(t('plans.detail.realExecutionForbidden'));
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
        meta: 'started',
        severity: 'info',
        text: t('plans.detail.deployStarted', {
          mode: applyMode ? 'APPLY' : 'PLAN',
          task: res?.task_id ? ` task_id=${res.task_id}` : '',
        }),
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
        setErr(payload?.error || t('plans.detail.cloudMismatchApply'));
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
            t('plans.detail.runningConflict'),
          ),
        });
        await fetchPlan();
        return;
      }
      if (status === 403 && payload?.code === 'PLAN_EXECUTION_FORBIDDEN') {
        setErr(payload?.error || t('plans.detail.noRealExecutionPermission'));
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(t('plans.detail.deployFailed', { error: backendMsg || e?.message || String(e) }));
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
          t('plans.detail.cloudMismatchDestroy'),
        );
      }
      actionLockRef.current = false;
      return;
    }
    if (
      !window.confirm(
        t('plans.detail.destroyConfirm')
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
        meta: 'started',
        severity: 'info',
        text: t('plans.detail.destroyQueued', {
          task: tid ? ` (task_id=${tid})` : '',
        }),
      });
      await fetchPlan();
      if (tid && tab === 'logs') {
        await fetchTaskLog(tid);
      }
    } catch (e) {
      const status = e?.status ?? e?.response?.status;
      const payload = e?.data ?? e?.response?.data;
      if (status === 409 && payload?.code === 'CLOUD_TARGET_CHANGED') {
        setErr(payload?.error || t('plans.detail.cloudMismatchDestroy'));
        await fetchPlan();
        return;
      }
      if (status === 409) {
        setErr(null);
        setMsg({
          severity: 'info',
          text: getConflictMessage(
            e,
            t('plans.detail.runningConflict'),
          ),
        });
        await fetchPlan();
        return;
      }
      if (status === 403 && payload?.code === 'PLAN_EXECUTION_FORBIDDEN') {
        setErr(payload?.error || t('plans.detail.noDestroyPermission'));
        return;
      }
      const backendMsg =
        payload?.error ||
        payload?.detail ||
        (typeof payload === 'string' ? payload : null);
      setErr(t('plans.detail.destroyFailed', { error: backendMsg || e?.message || String(e) }));
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
      ? t('plans.detail.redeployApply')
      : t('plans.detail.redeployPlan')
    : applyMode
      ? t('plans.detail.deployApply')
      : t('plans.detail.deployPlan');
  const actionAvailability = isRunning
    ? {
        severity: 'info',
        text: t('plans.detail.actionAvailability.running'),
      }
    : applyMode && !canApply
      ? {
          severity: 'warning',
          text: cloudTargetMismatch
            ? (cloudTargetState?.message || t('plans.detail.cloudMismatchApply'))
            : t('plans.detail.actionAvailability.applyForbidden'),
        }
    : canDestroy && isRedeployAvailable
      ? {
          severity: 'warning',
          text: t('plans.detail.actionAvailability.activeInfra'),
        }
      : canDeploy && lifecycle.key === 'NOT_APPLIED'
        ? {
            severity: 'info',
            text: t('plans.detail.actionAvailability.firstDeploy'),
          }
        : canDeploy && lifecycle.key === 'PREVIEW'
          ? {
              severity: 'info',
              text: t('plans.detail.actionAvailability.preview'),
            }
          : canDestroy
            ? {
                severity: 'warning',
                text: t('plans.detail.actionAvailability.recoverable'),
              }
            : null;

  const header = (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {plan?.name || t('plans.list.columns.plan')}
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
          {t('plans.detail.back')}
        </Button>
        {linkedCanvasId && (
          <Button
            variant="contained"
            onClick={() => navigate(`/admin/labs/${linkedCanvasId}/canvas`)}
          >
            {t('plans.detail.goToCanvas')}
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
            <Typography>{t('plans.detail.loading')}</Typography>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="warning">{t('plans.status.notFound')}</Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/plans')}>
              {t('plans.detail.back')}
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
          data-tour="plan-detail-header"
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
          {autoDestroyScheduled && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('plans.detail.autoDestroyScheduled', {
                date: formatDateTime(plan?.auto_destroy_at || plan?.autoDestroyAt),
                task: plan?.auto_destroy_task_id ? ` task_id=${plan.auto_destroy_task_id}.` : '',
              })}
            </Alert>
          )}
          {plan?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plan.error}
            </Alert>
          )}
          {(String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update') && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('plans.detail.canvasUpdatedAlert')}
            </Alert>
          )}
          {cloudTargetMismatch && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cloudTargetState?.message || t('plans.detail.cloudMismatchAlert')}
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
                    {t('plans.detail.controlTitle')}
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
                  <Typography variant="caption" color="text.secondary">{t('plans.detail.updated')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDateTime(plan?.updated_at)}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 1.1, borderRadius: 3, minWidth: 160, bgcolor: 'rgba(255,255,255,0.66)' }}>
                  <Typography variant="caption" color="text.secondary">{t('plans.list.lastAction', { value: '' }).replace(/\s*$/, '')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{plan?.last_action || plan?.lastAction || '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ px: 1.5, py: 1.1, borderRadius: 3, minWidth: 260, bgcolor: 'rgba(255,255,255,0.66)' }}>
                  <Typography variant="caption" color="text.secondary">{t('plans.detail.currentTask')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    {plan?.task_id || '—'}
                  </Typography>
                </Paper>
              </Stack>

              {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  {t('plans.detail.canvasChanged')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {lifecycle.helper}
              </Typography>
            </Stack>

            <Stack data-tour="plan-detail-actions" direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={applyMode}
                      onChange={(e) => setApplyMode(e.target.checked)}
                      disabled={busy || isRunning}
                    />
                  }
                  label={applyMode ? t('plans.detail.applyMode') : t('plans.detail.planMode')}
                />

                <Button
                  variant="contained"
                  onClick={handleDeploy}
                  disabled={!canDeploy || busy || (applyMode && !canApply)}
                  color={isRedeployAvailable ? 'warning' : 'primary'}
                >
                  {deploying ? t('plans.detail.launching') : deployActionLabel}
                </Button>

                {canDestroy && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDestroy}
                    disabled={!canDestroy || busy}
                  >
                    {destroying ? t('plans.detail.destroying') : t('plans.list.destroy')}
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

          {labNotes && (
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.72)',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700 }}>
                {t('plans.detail.labNotes')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {labNotes}
              </Typography>
            </Paper>
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
                    label={t('plans.detail.activeAutoRefresh')}
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
                      label={t('plans.detail.taskLabel', { value: plan?.task_id || t('labels.pending').toLowerCase() })}
                      sx={{ bgcolor: 'rgba(255,255,255,0.84)' }}
                    />
                    <Chip
                      size="small"
                      variant="filled"
                      color="default"
                      label={t('plans.detail.lastActionLabel', { value: plan?.last_action || plan?.lastAction || '—' })}
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
            data-tour="plan-detail-tabs"
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="summary" label={t('plans.detail.tabs.summary')} />
            <Tab value="outputs" label={t('plans.detail.tabs.outputs')} />
            <Tab value="tests" label={t('plans.detail.tabs.tests')} />
            <Tab value="logs" label={t('plans.detail.tabs.logs')} />
            <Tab value="payload" label={t('plans.detail.tabs.payload')} />
          </Tabs>

          <Divider />

          {/* SUMMARY */}
          {tab === 'summary' && (
            <Box sx={{ p: 3 }} data-tour="plan-detail-summary">
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
                      {t('plans.detail.summary.sectionTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('plans.detail.summary.sectionSubtitle')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" {...statusChipProps(plan?.status)} />
                    <Chip size="small" label={lifecycle.label} {...lifecycle.chip} />
                  </Stack>
                </Stack>
              </Paper>

              <Typography component="div" variant="body2" color="text.secondary">
                {t('plans.detail.summary.intro')}
              </Typography>

              {/* Microcopy aclaratorio */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('plans.detail.summary.introCaption')}
              </Typography>

              {/* Bloque Última ejecución */}
              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('plans.detail.summary.lastExecution')}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography component="div" variant="body2" color="text.secondary">
                      {t('plans.detail.lastActionLabel', { value: '' }).replace(/\s*$/, '')}{' '}
                      <b>{plan?.last_action || plan?.lastAction || '—'}</b>
                    </Typography>
                    {String(plan?.last_action || plan?.lastAction || '').toLowerCase() === 'canvas_update' && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        {t('plans.detail.canvasChanged')}
                      </Typography>
                    )}
                    <Typography component="div" variant="body2" color="text.secondary">
                      {t('plans.detail.summary.result')}{' '}
                      <Chip size="small" {...statusChipProps(plan?.status)} />
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      {t('plans.detail.summary.date')}{' '}
                      <b>{formatDateTime(plan?.updated_at)}</b>
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('plans.detail.summary.nextRealExecution')}
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
                      {t('plans.detail.summary.effectiveConnection')}{' '}
                      <b>{resolvedExecutionTarget.name || '—'}</b>
                      {resolvedExecutionTarget.id ? ` (${resolvedExecutionTarget.id})` : ''}
                    </Typography>
                    <Typography component="div" variant="body2" color="text.secondary">
                      {executionSourceLabels[resolvedExecutionTarget.source] || executionSourceLabels.unresolved}
                    </Typography>
                    {resolvedExecutionTarget.account_id && (
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.plannedAwsAccount')}{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {resolvedExecutionTarget.account_id}
                        </Box>
                      </Typography>
                    )}
                    {resolvedExecutionTarget.arn && (
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.knownArn')}{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {resolvedExecutionTarget.arn}
                        </Box>
                      </Typography>
                    )}
                    {!resolvedExecutionTarget.account_id && (
                      <Alert severity="info" variant="outlined">
                        {t('plans.detail.summary.executionResolvedNoIdentity')}
                      </Alert>
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('plans.detail.summary.cloudAccountReconciliation')}
                </Typography>
                <Alert
                  severity={cloudTargetMismatch ? 'warning' : 'success'}
                  variant="outlined"
                >
                  {cloudTargetState?.message || t('plans.detail.summary.cloudAccountNoInfo')}
                </Alert>
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('plans.detail.summary.lastApplyEvidence')}
                </Typography>
                {!hasLastApplyContext ? (
                  <Alert severity="info" variant="outlined">
                    {t('plans.detail.summary.noRealSnapshot')}
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
                        {t('plans.detail.summary.usedConnection')}{' '}
                        <b>{lastApplyContext.cloud_connection_name || t('plans.detail.summary.envCredentials')}</b>
                        {lastApplyContext.cloud_connection_id ? ` (${lastApplyContext.cloud_connection_id})` : ''}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.awsAccount')}{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.account_id || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.arn')}{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.arn || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.stsUserId')}{' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {lastApplyContext.user_id || '—'}
                        </Box>
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        {t('plans.detail.summary.capturedAt')}{' '}
                        <b>{formatDateTime(lastApplyContext.captured_at)}</b>
                      </Typography>
                    </Stack>

                    {lastApplyContext.identity_error && (
                      <Alert severity="warning" variant="outlined">
                        {t('plans.detail.summary.auditIdentityError', { error: lastApplyContext.identity_error })}
                      </Alert>
                    )}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ mt: 3, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('plans.detail.summary.recentHistory')}
                </Typography>
                {executionHistory.length === 0 ? (
                  <Alert severity="info" variant="outlined">
                    {t('plans.detail.summary.noHistory')}
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
                              label={item.simulate_only ? t('plans.list.mode.preview') : t('plans.list.mode.real')}
                              color={item.simulate_only ? 'info' : 'success'}
                              variant={item.simulate_only ? 'outlined' : 'filled'}
                            />
                            {item.cloud_connection_scope && (
                              <Chip size="small" label={`Scope: ${item.cloud_connection_scope}`} variant="outlined" />
                            )}
                          </Stack>
                          <Typography component="div" variant="body2" color="text.secondary">
                            {t('plans.detail.summary.requestedBy')}{' '}
                            <b>{item.requested_by?.display_name || item.requested_by?.email || '—'}</b>
                            {item.delegation_id ? ` · delegación ${item.delegation_id}` : ''}
                          </Typography>
                          <Typography component="div" variant="body2" color="text.secondary">
                            {t('plans.detail.summary.connection')}{' '}
                            <b>{item.cloud_connection_name || t('plans.detail.summary.envCredentials')}</b>
                            {item.resolved_execution_source ? ` · source ${item.resolved_execution_source}` : ''}
                          </Typography>
                          {(item.account_id || item.arn) && (
                            <Typography component="div" variant="body2" color="text.secondary">
                              {t('plans.detail.summary.identity')}{' '}
                              <Box component="span" sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {item.account_id || '—'}
                                {item.arn ? ` · ${item.arn}` : ''}
                              </Box>
                            </Typography>
                          )}
                          <Typography component="div" variant="body2" color="text.secondary">
                            {t('plans.detail.summary.start')} <b>{formatDateTime(item.started_at || item.created_at)}</b>
                            {item.completed_at ? ` · ${t('plans.detail.summary.end')} ${formatDateTime(item.completed_at)}` : ''}
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
                  {t('plans.detail.summary.riskTitle')}
                </Typography>
                {!planRiskSummary ? (
                  <Alert severity="info" variant="outlined">
                    {t('plans.detail.summary.loadLogsHint')}
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    <Alert severity={riskAlertSeverity} variant="outlined">
                      {riskSeverity === 'destructive'
                        ? t('plans.detail.summary.riskDestructive')
                        : riskSeverity === 'caution'
                          ? t('plans.detail.summary.riskCaution')
                          : riskSeverity === 'safe'
                            ? t('plans.detail.summary.riskSafe')
                            : t('plans.detail.summary.riskNone')}
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
                  {t('plans.detail.summary.advisoryTitle')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  {t('plans.detail.summary.advisoryCaption')}
                </Typography>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      {t('plans.detail.summary.advisoryCost')}
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
                      {t('plans.detail.summary.advisoryResidual')}
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
                      {t('plans.detail.summary.advisoryPedagogy')}
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
                  <Typography variant="h6">{t('plans.detail.outputs.title')}</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    {t('plans.detail.outputs.subtitle')}
                  </Typography>
                </Box>
                <Button
                  variant="text"
                  startIcon={<InfoOutlinedIcon />}
                  onClick={() => setOutputsInfoOpen(true)}
                >
                  {t('plans.detail.outputs.infoAws')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? t('plans.detail.outputs.loadingOutputs') : t('plans.detail.outputs.loadOutputs')}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!outputsResponse && (
                  <Alert severity="info">
                    {t('plans.detail.outputs.notLoaded')}
                  </Alert>
                )}

                {outputsResponse && (
                  <>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                      <Chip size="small" label={`backend_status: ${outputsResponse?.status ?? '—'}`} variant="outlined" />
                      <Chip
                        size="small"
                        label={outputsResponse?.applied ? t('plans.detail.outputs.appliedTrue') : t('plans.detail.outputs.appliedFalse')}
                        color={outputsResponse?.applied ? 'success' : 'default'}
                        variant={outputsResponse?.applied ? 'filled' : 'outlined'}
                      />
                    </Stack>

                    {outputsResponse?.outputs && Object.keys(outputsResponse.outputs).length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {t('plans.detail.outputs.empty')}
                      </Alert>
                    ) : null}

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {t('plans.detail.outputs.connectivitySummary')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {t('plans.detail.outputs.connectivityCaption')}
                      </Typography>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">{t('plans.detail.outputs.model')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{t(`plans.detail.outputs.modeLabels.${connectivityOverview.modeKey}`)}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                            {describeConnectivityMode(connectivityOverview.modeKey, connectivityOverview)}
                          </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">{t('plans.detail.outputs.expectedConnectivity')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {t('plans.detail.outputs.connectedPairs', { count: connectivityOverview.connectedPairs })}
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                            <Chip size="small" label={t('plans.detail.outputs.activePeerings', { count: connectivityOverview.peeringActive })} variant="outlined" />
                            <Chip size="small" label={t('plans.detail.outputs.activeTgw', { count: connectivityOverview.tgwActive })} variant="outlined" />
                          </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">{t('plans.detail.outputs.awsTranslation')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {t('plans.detail.outputs.attachments', { count: connectivityOverview.tgwAttachmentsActive || connectivityOverview.tgwAttachmentsDeclared })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                            {t('plans.detail.outputs.declaredPeeringsTgw', {
                              peerings: connectivityOverview.peeringDeclared,
                              tgw: connectivityOverview.tgwDeclared,
                            })}
                          </Typography>
                        </Paper>
                      </Stack>
                    </Box>

                    {vpcInfraCatalog.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          {t('plans.detail.outputs.vpcInfra')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          {t('plans.detail.outputs.vpcInfraCaption')}
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
                                  label={item.natGatewayId ? `NAT: ${item.natGatewayId}` : `NAT: —`}
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
                                    {t('plans.detail.outputs.instancesDetected')}
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
                                          label={t('plans.detail.outputs.privateIp', { value: instance.privateIp || '—' })}
                                          color={instance.privateIp ? 'info' : 'default'}
                                          variant={instance.privateIp ? 'filled' : 'outlined'}
                                        />
                                        <Chip
                                          size="small"
                                          label={t('plans.detail.outputs.publicIp', { value: instance.publicIp || '—' })}
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
                          {t('plans.detail.outputs.transitGatewayInfra')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          {t('plans.detail.outputs.transitGatewayCaption')}
                        </Typography>
                        <Stack spacing={1.5}>
                          {transitGatewayCatalog.map((item) => (
                            <Paper key={item.routerId} variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                {item.name}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: item.attachments.length > 0 ? 1.5 : 0 }}>
                                <Chip size="small" label={t('plans.detail.outputs.logicalRouter', { value: item.routerId })} variant="outlined" />
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
                                        {t('plans.detail.outputs.attachment')}
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
                          <Typography variant="subtitle2">{t('plans.detail.outputs.fullJsonTitle')}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('plans.detail.outputs.jsonCaption')}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant={outputsJsonOpen ? 'contained' : 'outlined'}
                          onClick={() => setOutputsJsonOpen((prev) => !prev)}
                        >
                          {outputsJsonOpen ? t('plans.detail.outputs.hideJson') : t('plans.detail.outputs.showJson')}
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
                  <Typography variant="h6">{t('plans.detail.tests.title')}</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    {t('plans.detail.tests.subtitle')}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={fetchOutputs}
                  disabled={outputsLoading}
                >
                  {outputsLoading ? t('plans.detail.outputs.loadingOutputs') : t('plans.detail.tests.loadOutputs')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setConsoleGuideOpen(true)}
                  disabled={!canOpenConsoleGuide}
                >
                  {t('plans.detail.tests.consoleGuide')}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                  {t('plans.detail.tests.introAlert')}
                </Alert>

                {!hasOutputsData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('plans.detail.tests.needOutputs')}
                  </Alert>
                )}

                {connectivityScenarios.length === 0 && managedEgressScenarios.length === 0 && publicAccessScenarios.length === 0 && (
                  <Alert severity="warning">
                    {t('plans.detail.tests.empty')}
                  </Alert>
                )}

                {connectivityScenarios.map((scenario) => (
                  <Paper key={`${scenario.aId}:${scenario.bId}`} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {scenario.aVpc.name} ↔ {scenario.bVpc.name}
                      </Typography>
                      <Chip size="small" label={t(`plans.detail.tests.modeLabels.${scenario.modeKey}`)} color="primary" variant="outlined" />
                      <Chip size="small" label={`${scenario.aVpc.cidr} / ${scenario.bVpc.cidr}`} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {t('plans.detail.tests.routersInvolved', {
                        value: scenario.routers.length > 0 ? scenario.routers.join(', ') : 'n/a',
                      })}
                    </Typography>

                    {!scenario.readyForRun && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        {t('plans.detail.tests.insufficientRoundTrip')}
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
                        {scenario.hasPrivateSubnets
                          ? t('plans.detail.tests.managedEgressTitle', { name: scenario.vpcName })
                          : t('plans.detail.tests.managedEgressNoPrivateTitle', { name: scenario.vpcName })}
                      </Typography>
                      <Chip size="small" label={t('plans.detail.tests.singleVpc')} variant="outlined" />
                      <Chip size="small" label={t('plans.detail.tests.managedEgress')} color="info" variant="outlined" />
                      <Chip size="small" label={scenario.cidr} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {t('plans.detail.tests.natZone', {
                        subnet: scenario.egressSubnetName || 'n/a',
                        natId: scenario.natGatewayId || 'n/a',
                      })}
                    </Typography>

                    {!scenario.readyForRun && (
                      <Alert severity="warning" sx={{ mt: 1.5 }}>
                        {t('plans.detail.tests.missingManagedOutputs')}
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
                        {t(
                          scenario.hasPrivateWorkload
                            ? 'plans.detail.tests.observeBastionAndPrivate'
                            : 'plans.detail.tests.observeBastionPublic',
                        )}
                      </Alert>
                      {scenario.hasPrivateWorkload ? (
                        <>
                          <Alert severity="info" variant="outlined">
                            {t('plans.detail.tests.observePrivateReachability')}
                          </Alert>
                          <Alert severity="info" variant="outlined">
                            {t('plans.detail.tests.observeNatBehavior')}
                          </Alert>
                        </>
                      ) : (
                        <>
                          <Alert severity="warning" variant="outlined">
                            {t('plans.detail.tests.observeNatNoPrivate')}
                          </Alert>
                          <Alert severity="info" variant="outlined">
                            {t('plans.detail.tests.observeCostBenefit')}
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
                        {t('plans.detail.tests.publicAccessTitle', { name: scenario.vpcName })}
                      </Typography>
                      <Chip size="small" label={t('plans.detail.tests.singleVpc')} variant="outlined" />
                      <Chip size="small" label={t('plans.detail.tests.publicBastion')} color="success" variant="outlined" />
                      <Chip size="small" label={scenario.cidr} variant="outlined" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {t('plans.detail.tests.bastionPublicIp', {
                        name: scenario.bastion.instanceName,
                        value: scenario.bastion.publicIp || 'n/a',
                      })}
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
                        {t('plans.detail.tests.observePublicSsh')}
                      </Alert>
                      <Alert severity="warning" variant="outlined">
                        {t('plans.detail.tests.observePublicExposure')}
                      </Alert>
                    </Stack>
                  </Paper>
                ))}

                <Alert severity="info" variant="outlined">
                  {t('plans.detail.tests.expectedResult')}
                </Alert>
              </Box>
            </Box>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{t('plans.detail.logs.title')}</Typography>
                  <Typography component="div" variant="body2" color="text.secondary">
                    {t('plans.detail.logs.subtitle')}
                  </Typography>
                </Box>
                {isRunning && (
                  <Chip
                    size="small"
                    color="info"
                    variant="filled"
                    label={t('plans.detail.logs.streaming')}
                  />
                )}
                <Button variant="contained" onClick={fetchPlanLogs}>
                  {t('plans.detail.logs.viewLog')}
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {!logText && (
                  <Alert severity="info">
                    {t('plans.detail.logs.empty')}
                  </Alert>
                )}

                {logText && (
                  <>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      {t('plans.detail.logs.currentLog')}
                    </Alert>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {t('plans.detail.logs.updatedAt')}{' '}
                        <b>{logUpdatedAt ? formatDateTime(logUpdatedAt) : '—'}</b>
                      </Typography>
                      {isRunning && (
                        <Typography variant="caption" color="info.main">
                          {t('plans.detail.logs.autoScroll')}
                        </Typography>
                      )}
                    </Stack>
                    {planRiskSummary && (
                      <Alert severity={riskAlertSeverity} sx={{ mb: 1 }}>
                        {t('plans.detail.logs.terraformSummary', {
                          add: planRiskSummary.add,
                          change: planRiskSummary.change,
                          destroy: planRiskSummary.destroy,
                          replace: planRiskSummary.replace,
                        })}
                      </Alert>
                    )}
                    {highlightedLogLineStart !== null && (
                      <Alert severity="success" variant="outlined" sx={{ mb: 1 }}>
                        {t('plans.detail.logs.newLines')}
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
                {t('plans.detail.payload.title')}
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
      <TourLauncherButton
        onClick={() => restartTour('plan-detail-overview')}
        label={t('plans.detail.tourLabel')}
      />
      <Dialog
        open={consoleGuideOpen}
        onClose={() => setConsoleGuideOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('plans.detail.guide.consoleTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" variant="outlined">
              {t('plans.detail.guide.consoleIntro')}
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step1')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('plans.detail.guide.step1Text')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step2')}
              </Typography>
              <Stack spacing={1}>
                {consoleGuide.bastions.map((item) => (
                  <Paper key={`${item.vpcId}:${item.instanceId || item.instanceName}`} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.vpcName}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t('plans.detail.guide.instanceLabel', {
                        name: item.instanceName,
                        value: item.instanceId || 'n/a',
                      })}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t('plans.detail.guide.publicPrivateIp', {
                        publicIp: item.publicIp || 'n/a',
                        privateIp: item.privateIp || 'n/a',
                      })}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t('plans.detail.guide.regionAzKeyPair', {
                        region: item.region,
                        az: item.availabilityZone,
                        keyPair: item.keyPair,
                      })}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step3')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step3Text')}
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
{`chmod 400 ~/.ssh/<tu-clave-privada>
ssh -i ~/.ssh/<tu-clave-privada> ec2-user@${consoleGuide.bastions[0]?.publicIp || 'IP_PUBLICA_BASTION'}`}
                </Box>
              </Paper>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step4')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('plans.detail.guide.step4Text')}
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
                {t('plans.detail.guide.step5')}
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
              {t('plans.detail.guide.consoleExpected')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsoleGuideOpen(false)}>{t('actions.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
