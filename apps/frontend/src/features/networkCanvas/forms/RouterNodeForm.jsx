/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { Netmask } from "netmask";
import { useTranslation } from "react-i18next";

/* ========================= Helpers ========================= */

const normalizeCidr = (val) => (val || "").trim();
const normalizeMode = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (
    raw === "tgw" ||
    raw === "transit" ||
    raw === "transit_gateway" ||
    raw === "transit-gateway"
  ) {
    return "tgw";
  }
  return "peering";
};

// cidrA está contenido en cidrB
const cidrWithin = (cidrA, cidrB) => {
  try {
    const a = new Netmask(cidrA);
    const b = new Netmask(cidrB);
    return b.contains(a.base) && b.contains(a.broadcast);
  } catch {
    return false;
  }
};

const isValidCidr = (cidr) => {
  try {
    // Netmask acepta 192.168.0.0/24 etc.
    // Lanzará excepción si es inválido
    // También admitimos host routes tipo /32
    // (si no las quieres, agrega una regla extra)
    // eslint-disable-next-line no-new
    new Netmask(cidr);
    return true;
  } catch {
    return false;
  }
};

const findVpcById = (list, id) => list.find((v) => v.id === id) || null;

const sameRoute = (a, b) =>
  a.sourceVpcId === b.sourceVpcId && normalizeCidr(a.destCidr) === normalizeCidr(b.destCidr);

const isDuplicate = (routes, idx) =>
  routes.some((r, i) => i !== idx && sameRoute(r, routes[idx]));

const pairKey = (a, b) => (a < b ? `${a}::${b}` : `${b}::${a}`);

const isUnidirectional = (route, routes, connectedVpcs) => {
  if (!route.sourceVpcId || !route.destVpcId) return false;

  const destVpc = findVpcById(connectedVpcs, route.destVpcId);
  const sourceVpc = findVpcById(connectedVpcs, route.sourceVpcId);
  if (!destVpc || !sourceVpc) return false;

  const reverseExists = routes.some(
    (r) =>
      r.sourceVpcId === route.destVpcId &&
      normalizeCidr(r.destCidr) === normalizeCidr(sourceVpc.cidr)
  );

  return !reverseExists;
};
/**
 * Valida una fila de ruta:
 * - sourceVpc existente
 * - destCidr válido
 * - si destVpcId se indica, destCidr debe estar DENTRO de esa VPC
 * - no‑transitiva: source y destVpc (si se elige) deben formar parte de connectedVpcs
 * - duplicada
 */
const routeError = (r, idx, routes, connectedVpcs, t) => {
  if (!r.sourceVpcId) return t("canvas.routerForm.validation.selectSource");

  const srcVpc = findVpcById(connectedVpcs, r.sourceVpcId);
  if (!srcVpc) return t("canvas.routerForm.validation.sourceNotConnected");

  const dest = normalizeCidr(r.destCidr);
  if (!dest) return t("canvas.routerForm.validation.destRequired");
  if (!isValidCidr(dest)) return t("canvas.routerForm.validation.destInvalid");

  if (r.destVpcId) {
    const dstVpc = findVpcById(connectedVpcs, r.destVpcId);
    if (!dstVpc) return t("canvas.routerForm.validation.destNotConnected");
    const vpcCidr = normalizeCidr(dstVpc.cidr || "");
    if (vpcCidr && !(dest === vpcCidr || cidrWithin(dest, vpcCidr))) {
      return t("canvas.routerForm.validation.destWithinSegment", { value: vpcCidr });
    }
  }

  if (isDuplicate(routes, idx)) return t("canvas.routerForm.validation.duplicateRoute");

  return null;
};

/* ========================= Componente ========================= */

export default function RouterNodeForm({
  nodeData = {},
  onSave,
  deleteNode,
  // [{id, name, cidr}], únicamente VPCs conectadas a ESTE router
  connectedVpcs = [],
  vlanRegion = "us-east-1",
}) {
  const { t } = useTranslation();
  // Rutas persistidas previamente
  const [routes, setRoutes] = useState(() =>
    Array.isArray(nodeData.routeTable) ? nodeData.routeTable : []
  );

  const [identifier, setIdentifier] = useState(nodeData.identifier || "");
  const [mode, setMode] = useState(normalizeMode(nodeData.mode || "peering"));

  useEffect(() => {
    setIdentifier(nodeData.identifier || "");
    setMode(normalizeMode(nodeData.mode || "peering"));
  }, [nodeData.identifier, nodeData.mode]);

  // Si desconectas/renombras VPCs, limpiamos rutas que ya no aplican
  useEffect(() => {
    setRoutes((prev) =>
      prev
        .map((r) => ({
          ...r,
          // normaliza por si acaso
          destCidr: normalizeCidr(r.destCidr),
        }))
        .filter((r) => !r.sourceVpcId || !!findVpcById(connectedVpcs, r.sourceVpcId))
    );
  }, [connectedVpcs]);

  const canAdd = connectedVpcs.length >= 2;

  // =========================
  // Conceptual explanation (UI guidance only)
  // =========================
  const academicMode = useMemo(() => {
    const count = connectedVpcs.length;

    if (count < 2) {
      return {
        type: "info",
        title: t("canvas.routerForm.academic.noConnectivity.title"),
        message: t("canvas.routerForm.academic.noConnectivity.message"),
      };
    }

    if (count === 2) {
      return {
        type: "success",
        title: t("canvas.routerForm.academic.pointToPoint.title"),
        message: t("canvas.routerForm.academic.pointToPoint.message"),
      };
    }

    return {
      type: "warning",
      title: t("canvas.routerForm.academic.multiPoint.title"),
      message: t("canvas.routerForm.academic.multiPoint.message"),
    };
  }, [connectedVpcs.length, t]);

  const addRoute = () => {
    if (!canAdd) return;
    const src = connectedVpcs[0];
    const dst = connectedVpcs.find((v) => v.id !== src.id) || connectedVpcs[0];
    setRoutes((r) => [
      ...r,
      {
        sourceVpcId: src.id,
        destVpcId: dst.id,
        destCidr: normalizeCidr(dst.cidr || ""),
      },
    ]);
  };

  const updateRoute = (idx, patch) => {
    setRoutes((rs) => {
      const next = [...rs];
      let row = { ...next[idx], ...patch };

      // Si se cambia la VPC destino, autocompletamos su CIDR
      if (patch.destVpcId) {
        const v = findVpcById(connectedVpcs, patch.destVpcId);
        if (v?.cidr) row.destCidr = normalizeCidr(v.cidr);
      }

      // Normaliza el CIDR si viene del TextField
      if (patch.destCidr != null) {
        row.destCidr = normalizeCidr(patch.destCidr);
      }

      next[idx] = row;
      return next;
    });
  };

  const removeRoute = (idx) => {
    setRoutes((r) => r.filter((_, i) => i !== idx));
  };

  // Errores por fila
  const rowErrors = useMemo(
    () => routes.map((r, i) => routeError(r, i, routes, connectedVpcs, t)),
    [routes, connectedVpcs, t]
  );

  const routePairStats = useMemo(() => {
    const connectedIds = new Set(connectedVpcs.map((vpc) => vpc.id));
    const pairs = new Map();

    routes.forEach((route) => {
      if (!route?.sourceVpcId || !route?.destVpcId) return;
      if (route.sourceVpcId === route.destVpcId) return;
      if (!connectedIds.has(route.sourceVpcId) || !connectedIds.has(route.destVpcId)) {
        return;
      }

      const key = pairKey(route.sourceVpcId, route.destVpcId);
      if (!pairs.has(key)) {
        pairs.set(key, {
          a: route.sourceVpcId < route.destVpcId ? route.sourceVpcId : route.destVpcId,
          b: route.sourceVpcId < route.destVpcId ? route.destVpcId : route.sourceVpcId,
          aToB: false,
          bToA: false,
        });
      }

      const pair = pairs.get(key);
      if (route.sourceVpcId === pair.a && route.destVpcId === pair.b) pair.aToB = true;
      if (route.sourceVpcId === pair.b && route.destVpcId === pair.a) pair.bToA = true;
    });

    let bidirectional = 0;
    let oneWay = 0;
    pairs.forEach((pair) => {
      if (pair.aToB && pair.bToA) bidirectional += 1;
      else oneWay += 1;
    });

    return {
      totalPairsWithRoutes: pairs.size,
      bidirectional,
      oneWay,
    };
  }, [routes, connectedVpcs]);

  const normalizedMode = normalizeMode(mode);
  const connectedVpcCount = connectedVpcs.length;
  const potentialPairs =
    connectedVpcCount >= 2
      ? (connectedVpcCount * (connectedVpcCount - 1)) / 2
      : 0;
  const hasPendingReverseForPeering =
    normalizedMode === "peering" && routePairStats.oneWay > 0;
  const hasExplicitPolicies = routes.length > 0;
  const hasEffectiveConnectivity =
    normalizedMode === "tgw"
      ? hasExplicitPolicies
      : routePairStats.bidirectional > 0;

  const modeSummary = useMemo(() => {
    if (normalizedMode === "tgw") {
      return {
        severity: connectedVpcCount >= 3 ? "success" : "warning",
        title: t("canvas.routerForm.modeSummary.tgw.title"),
        detail:
          connectedVpcCount >= 3
            ? t("canvas.routerForm.modeSummary.tgw.detailLarge", { count: connectedVpcCount })
            : t("canvas.routerForm.modeSummary.tgw.detailSmall"),
        bullets: [
          t("canvas.routerForm.modeSummary.tgw.bulletAws"),
          t("canvas.routerForm.modeSummary.tgw.bulletTraffic"),
          t("canvas.routerForm.modeSummary.tgw.bulletPing"),
        ],
      };
    }

    return {
      severity: hasPendingReverseForPeering ? "warning" : "info",
      title: t("canvas.routerForm.modeSummary.peering.title"),
      detail: t("canvas.routerForm.modeSummary.peering.detail", { count: potentialPairs }),
      bullets: [
        t("canvas.routerForm.modeSummary.peering.bulletAws"),
        t("canvas.routerForm.modeSummary.peering.bulletTransit"),
        connectedVpcCount > 2
          ? t("canvas.routerForm.modeSummary.peering.bulletManySegments")
          : t("canvas.routerForm.modeSummary.peering.bulletSmallLabs"),
      ],
    };
  }, [
    normalizedMode,
    connectedVpcCount,
    potentialPairs,
    hasPendingReverseForPeering,
    t,
  ]);

  const routingCopy = useMemo(() => {
    if (normalizedMode === "tgw") {
      return {
        sectionTitle: t("canvas.routerForm.routingCopy.tgw.sectionTitle"),
        intro: t("canvas.routerForm.routingCopy.tgw.intro"),
        explainer: t("canvas.routerForm.routingCopy.tgw.explainer"),
        sourceLabel: t("canvas.routerForm.routingCopy.tgw.sourceLabel"),
        destVpcLabel: t("canvas.routerForm.routingCopy.tgw.destVpcLabel"),
        destCidrLabel: t("canvas.routerForm.routingCopy.tgw.destCidrLabel"),
        oneWayLabel: t("canvas.routerForm.routingCopy.tgw.oneWayLabel"),
      };
    }

    return {
      sectionTitle: t("canvas.routerForm.routingCopy.peering.sectionTitle"),
      intro: t("canvas.routerForm.routingCopy.peering.intro"),
      explainer: t("canvas.routerForm.routingCopy.peering.explainer"),
      sourceLabel: t("canvas.routerForm.routingCopy.peering.sourceLabel"),
      destVpcLabel: t("canvas.routerForm.routingCopy.peering.destVpcLabel"),
      destCidrLabel: t("canvas.routerForm.routingCopy.peering.destCidrLabel"),
      oneWayLabel: t("canvas.routerForm.routingCopy.peering.oneWayLabel"),
    };
  }, [normalizedMode, t]);

  const hasErrors = rowErrors.some(Boolean);
  const disableSave = hasErrors || hasPendingReverseForPeering;

  const handleSave = () => {
    if (disableSave) return;
    onSave({
      ...nodeData,
      identifier:
        identifier ||
        (nodeData.label || "").replace(/^router-/, "") ||
        "",
      mode,
      routeTable: routes,
      region: nodeData.region || vlanRegion,
    });
  };

  return (
    <Box sx={{ minWidth: 560 }} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">{t("canvas.routerForm.headerEyebrow")}</Typography>
        <Typography className="pt-node-form__title">{t("canvas.routerForm.headerTitle")}</Typography>
        <Typography className="pt-node-form__subtitle">
          {t("canvas.routerForm.headerSubtitle")}
        </Typography>
      </Box>

      <TextField
        fullWidth
        label={t("canvas.routerForm.identifier")}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t("canvas.routerForm.connectedSegments")}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {connectedVpcs.map((v) => (
            <Chip
              key={v.id}
              size="small"
              label={`${v.name} • ${v.cidr || t("canvas.routerForm.cidrNa")}`}
              variant="outlined"
            />
          ))}
          {!connectedVpcs.length && (
            <Typography variant="body2" color="text.secondary">
              {t("canvas.routerForm.none")}
            </Typography>
          )}
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Alert severity={academicMode.type} variant="outlined">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {academicMode.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {academicMode.message}
            </Typography>
          </Alert>
        </Box>
      </Box>

      {/* Selector de modo real de despliegue */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {t("canvas.routerForm.connectivityModel")}
        </Typography>
        <Select
          size="small"
          fullWidth
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <MenuItem value="peering">
            {t("canvas.routerForm.modeOptions.peering")}
          </MenuItem>
          <MenuItem value="tgw">
            {t("canvas.routerForm.modeOptions.tgw")}
          </MenuItem>
        </Select>

        <Typography variant="caption" color="text.secondary">
          {t("canvas.routerForm.modeHelp")}
        </Typography>
      </Box>

      <Alert severity={modeSummary.severity} variant="outlined" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {modeSummary.title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {modeSummary.detail}
        </Typography>
        <Box sx={{ mt: 0.8 }}>
          {modeSummary.bullets.map((line) => (
            <Typography key={line} variant="caption" display="block">
              • {line}
            </Typography>
          ))}
        </Box>
      </Alert>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={normalizedMode === "tgw" ? t("canvas.routerForm.chips.awsHub") : t("canvas.routerForm.chips.awsDirect")}
          color={normalizedMode === "tgw" ? "primary" : "secondary"}
          variant="filled"
        />
        <Chip
          size="small"
          label={
            normalizedMode === "tgw"
              ? t("canvas.routerForm.chips.readingHub")
              : t("canvas.routerForm.chips.readingDirect")
          }
          variant="outlined"
        />
        <Chip
          size="small"
          label={
            normalizedMode === "tgw"
              ? t("canvas.routerForm.chips.scales")
              : t("canvas.routerForm.chips.simple")
          }
          color={normalizedMode === "tgw" ? "success" : "default"}
          variant={normalizedMode === "tgw" ? "filled" : "outlined"}
        />
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={t("canvas.routerForm.stats.pairs", { count: routePairStats.totalPairsWithRoutes })}
          variant="outlined"
        />
        <Chip
          size="small"
          color="success"
          label={t("canvas.routerForm.stats.bidirectional", { count: routePairStats.bidirectional })}
          variant={routePairStats.bidirectional > 0 ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          color={routePairStats.oneWay > 0 ? "warning" : "default"}
          label={t("canvas.routerForm.stats.oneWay", { count: routePairStats.oneWay })}
          variant={routePairStats.oneWay > 0 ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          color={hasEffectiveConnectivity ? "success" : "warning"}
          label={
            hasEffectiveConnectivity
              ? (
                normalizedMode === "tgw"
                  ? t("canvas.routerForm.stats.effectiveHub")
                  : t("canvas.routerForm.stats.effectiveDirect")
              )
              : t("canvas.routerForm.stats.isolated")
          }
          variant="filled"
        />
      </Stack>

      {hasPendingReverseForPeering && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("canvas.routerForm.alerts.pendingReverse.before")} <b>{t("canvas.routerForm.modeOptions.peering")}</b> {t("canvas.routerForm.alerts.pendingReverse.after")}
        </Alert>
      )}

      {!hasExplicitPolicies && connectedVpcCount >= 2 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("canvas.routerForm.alerts.noPolicies.before")} <b>{t("canvas.routerForm.alerts.noPolicies.isolated")}</b> {t("canvas.routerForm.alerts.noPolicies.after")}
        </Alert>
      )}

      {hasExplicitPolicies && !hasEffectiveConnectivity && connectedVpcCount >= 2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("canvas.routerForm.alerts.notEffective")}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {routingCopy.sectionTitle}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {routingCopy.intro}
      </Typography>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        {routingCopy.explainer}
      </Alert>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        {t("canvas.routerForm.table.edgesMeaning")}
      </Alert>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t("canvas.routerForm.table.title")}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.4 }}>
          {t("canvas.routerForm.table.origin")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.routerForm.table.destination")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.routerForm.table.peering")}
        </Typography>
        <Typography variant="caption" display="block">
          {t("canvas.routerForm.table.tgw")}
        </Typography>
      </Alert>

      {routes.map((r, idx) => {
        const err = rowErrors[idx];
        const showUnidirectional =
          !err &&
          r.destVpcId &&
          isUnidirectional(r, routes, connectedVpcs);
        return (
          <Stack
            key={idx}
            direction="row"
            alignItems="flex-start"
            gap={1}
            sx={{ mb: 1.5, flexWrap: "wrap" }}
          >
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption">{routingCopy.sourceLabel}</Typography>
              <Select
                size="small"
                value={r.sourceVpcId || ""}
                onChange={(e) => updateRoute(idx, { sourceVpcId: e.target.value })}
                fullWidth
              >
                {connectedVpcs.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ minWidth: 220 }}>
              <Typography variant="caption">{routingCopy.destVpcLabel}</Typography>
              <Select
                size="small"
                value={r.destVpcId || ""}
                onChange={(e) => updateRoute(idx, { destVpcId: e.target.value })}
                displayEmpty
                fullWidth
              >
                <MenuItem value="">
                  <em>{t("canvas.routerForm.noneOption")}</em>
                </MenuItem>
                {connectedVpcs
                  .filter((v) => v.id !== r.sourceVpcId)
                  .map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name} • {v.cidr || t("canvas.routerForm.cidrNa")}
                    </MenuItem>
                  ))}
              </Select>
            </Box>

            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="caption">{routingCopy.destCidrLabel}</Typography>
              <TextField
                size="small"
                fullWidth
                value={r.destCidr || ""}
                onChange={(e) => updateRoute(idx, { destCidr: e.target.value })}
                error={!!err}
                helperText={err || " "}
              />
            </Box>
            {showUnidirectional && (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={routingCopy.oneWayLabel}
                sx={{ mt: "26px" }}
              />
            )}
            <Box sx={{ pt: "26px" }}>
              <IconButton aria-label={t("canvas.routerForm.actions.deleteRoute")} onClick={() => removeRoute(idx)}>
                <DeleteOutline />
              </IconButton>
            </Box>
          </Stack>
        );
      })}

      <Stack direction="row" gap={1} sx={{ mt: 1 }} className="pt-node-form__actions">
        <Button variant="outlined" onClick={addRoute} disabled={!canAdd}>
          {t("canvas.routerForm.actions.addRoute")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleSave} disabled={disableSave}>
          {t("canvas.routerForm.actions.save")}
        </Button>
        <Button color="error" onClick={deleteNode}>
          {t("canvas.routerForm.actions.deleteNode")}
        </Button>
      </Stack>
    </Box>
  );
}
