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
const routeError = (r, idx, routes, connectedVpcs) => {
  if (!r.sourceVpcId) return "Selecciona la VPC de origen";

  const srcVpc = findVpcById(connectedVpcs, r.sourceVpcId);
  if (!srcVpc) return "La VPC de origen no está conectada a este router";

  const dest = normalizeCidr(r.destCidr);
  if (!dest) return "Destination CIDR es requerido";
  if (!isValidCidr(dest)) return "Destination CIDR inválido";

  if (r.destVpcId) {
    const dstVpc = findVpcById(connectedVpcs, r.destVpcId);
    if (!dstVpc) return "La VPC destino no está conectada a este router";
    const vpcCidr = normalizeCidr(dstVpc.cidr || "");
    if (vpcCidr && !(dest === vpcCidr || cidrWithin(dest, vpcCidr))) {
      return `El CIDR destino debe ser ${vpcCidr} o estar contenido en esa VPC`;
    }
  }

  if (isDuplicate(routes, idx)) return "Ruta duplicada (mismo origen y CIDR destino)";

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
  const academicMode = (() => {
    const count = connectedVpcs.length;

    if (count < 2) {
      return {
        type: "info",
        title: "Sin conectividad entre VPCs",
        message:
          "Este router necesita al menos 2 VPCs conectadas para poder enrutar tráfico entre ellas.",
      };
    }

    if (count === 2) {
      return {
        type: "success",
        title: "Topología punto a punto",
        message:
          "Con 2 VPCs conectadas, el router actuará como un intermediario simple. Solo habrá comunicación si defines rutas explícitas.",
      };
    }

    return {
      type: "warning",
      title: "Topología multipunto",
      message:
        "Con más de 2 VPCs conectadas, este router centraliza el enrutamiento. Debes definir rutas claras para controlar qué VPC puede comunicarse con cuál.",
    };
  })();

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
    () => routes.map((r, i) => routeError(r, i, routes, connectedVpcs)),
    [routes, connectedVpcs]
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

  const modeSummary = useMemo(() => {
    if (normalizedMode === "tgw") {
      return {
        severity: connectedVpcCount >= 3 ? "success" : "warning",
        title: "Transit Gateway (hub-and-spoke)",
        detail:
          connectedVpcCount >= 3
            ? `Se creará 1 TGW con ${connectedVpcCount} attachment(s). Escala mejor cuando hay varias VPC.`
            : "Con pocas VPC, TGW puede ser más complejo y costoso que peering.",
        bullets: [
          "Implementación AWS: 1 Transit Gateway + 1 attachment por VPC conectada.",
          "El tráfico pasa por el hub central; no hay malla de peerings entre pares.",
          "Para ping bidireccional, define rutas de ida y vuelta en la tabla del router.",
        ],
      };
    }

    return {
      severity: hasPendingReverseForPeering ? "warning" : "info",
      title: "VPC Peering (enlace por pares)",
      detail: `Con tu topología actual, el máximo son ${potentialPairs} peering(s).`,
      bullets: [
        "Implementación AWS: 1 conexión peering por par con rutas declaradas en ambos sentidos.",
        "No es transitivo: A↔B y B↔C no habilita A↔C automáticamente.",
        connectedVpcCount > 2
          ? "Con varias VPC aumenta el número de pares y el mantenimiento de rutas."
          : "Es ideal para laboratorios pequeños y directos.",
      ],
    };
  }, [
    normalizedMode,
    connectedVpcCount,
    potentialPairs,
    hasPendingReverseForPeering,
  ]);

  const routingCopy = useMemo(() => {
    if (normalizedMode === "tgw") {
      return {
        sectionTitle: "Rutas hacia el hub",
        intro:
          "Cada fila indica qué tráfico sale desde una VPC y se envía al Transit Gateway para alcanzar otra red conectada al hub.",
        explainer:
          "Aquí no defines un enlace directo entre pares. Defines qué destinos deben enviarse al hub central.",
        sourceLabel: "VPC que envía al hub",
        destVpcLabel: "VPC alcanzada vía hub",
        destCidrLabel: "CIDR enviado al hub",
        oneWayLabel: "Falta retorno",
      };
    }

    return {
      sectionTitle: "Rutas entre pares",
      intro:
        "Cada fila representa un destino directo entre VPCs. En peering, el par solo queda operativo cuando declaras ida y vuelta.",
      explainer:
        "Aquí sí estás modelando conectividad directa entre dos VPC específicas.",
      sourceLabel: "VPC de origen",
      destVpcLabel: "VPC destino directa",
      destCidrLabel: "CIDR destino",
      oneWayLabel: "Solo ida",
    };
  }, [normalizedMode]);

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
        <Typography className="pt-node-form__eyebrow">routing node</Typography>
        <Typography className="pt-node-form__title">Router</Typography>
        <Typography className="pt-node-form__subtitle">
          Define routing mode and traffic policies between connected VPCs.
        </Typography>
      </Box>

      <TextField
        fullWidth
        label="Identificador"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          VPCs conectadas a este router:
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {connectedVpcs.map((v) => (
            <Chip
              key={v.id}
              size="small"
              label={`${v.name} • ${v.cidr || "CIDR n/a"}`}
              variant="outlined"
            />
          ))}
          {!connectedVpcs.length && (
            <Typography variant="body2" color="text.secondary">
              (ninguna)
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
          Cómo se construirá en AWS
        </Typography>
        <Select
          size="small"
          fullWidth
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <MenuItem value="peering">
            Peering (modo seguro por defecto)
          </MenuItem>
          <MenuItem value="tgw">
            Transit Gateway (explícito)
          </MenuItem>
        </Select>

        <Typography variant="caption" color="text.secondary">
          Este selector define cómo AWS implementa el enrutamiento: Peering por pares o Transit Gateway central.
          La conectividad final depende de las rutas que declares.
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
          label={normalizedMode === "tgw" ? "AWS: 1 hub central" : "AWS: enlaces por pares"}
          color={normalizedMode === "tgw" ? "primary" : "secondary"}
          variant="filled"
        />
        <Chip
          size="small"
          label={
            normalizedMode === "tgw"
              ? "Lectura: el tráfico pasa por el hub"
              : "Lectura: el tráfico va directo entre VPCs"
          }
          variant="outlined"
        />
        <Chip
          size="small"
          label={
            normalizedMode === "tgw"
              ? "Escala mejor con varias VPCs"
              : "Más simple con pocas VPCs"
          }
          color={normalizedMode === "tgw" ? "success" : "default"}
          variant={normalizedMode === "tgw" ? "filled" : "outlined"}
        />
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={`Pares con rutas: ${routePairStats.totalPairsWithRoutes}`}
          variant="outlined"
        />
        <Chip
          size="small"
          color="success"
          label={`Bidireccionales: ${routePairStats.bidirectional}`}
          variant={routePairStats.bidirectional > 0 ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          color={routePairStats.oneWay > 0 ? "warning" : "default"}
          label={`Solo ida: ${routePairStats.oneWay}`}
          variant={routePairStats.oneWay > 0 ? "filled" : "outlined"}
        />
      </Stack>

      {hasPendingReverseForPeering && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          En modo <b>Peering</b> necesitas rutas de ida y vuelta por cada par de VPC para que ese enlace se despliegue.
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

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Cómo leer esta tabla
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.4 }}>
          - Origen: VPC desde la que sale el tráfico.
        </Typography>
        <Typography variant="caption" display="block">
          - Destino: red que quieres alcanzar.
        </Typography>
        <Typography variant="caption" display="block">
          - En peering modelas conectividad directa entre pares.
        </Typography>
        <Typography variant="caption" display="block">
          - En TGW modelas qué destinos deben enviarse al hub central.
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
            {/* Source VPC */}
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

            {/* Dest VPC (opcional) */}
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
                  <em>— Ninguna —</em>
                </MenuItem>
                {connectedVpcs
                  .filter((v) => v.id !== r.sourceVpcId)
                  .map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name} • {v.cidr || "CIDR n/a"}
                    </MenuItem>
                  ))}
              </Select>
            </Box>

            {/* Dest CIDR */}
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
              <IconButton aria-label="delete" onClick={() => removeRoute(idx)}>
                <DeleteOutline />
              </IconButton>
            </Box>
          </Stack>
        );
      })}

      <Stack direction="row" gap={1} sx={{ mt: 1 }} className="pt-node-form__actions">
        <Button variant="outlined" onClick={addRoute} disabled={!canAdd}>
          + Ruta
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleSave} disabled={disableSave}>
          Guardar
        </Button>
        <Button color="error" onClick={deleteNode}>
          Delete Node
        </Button>
      </Stack>
    </Box>
  );
}
