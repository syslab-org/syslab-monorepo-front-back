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
  const [mode, setMode] = useState(nodeData.mode || "peering");

  useEffect(() => {
    setIdentifier(nodeData.identifier || "");
    setMode(nodeData.mode || "peering");
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

  const hasErrors = rowErrors.some(Boolean);

  const handleSave = () => {
    if (hasErrors) return;
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
    <Box sx={{ minWidth: 560 }}>
      <Typography variant="h6" gutterBottom>
        Router
      </Typography>

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
          Este selector define cómo se implementará la conectividad en AWS:
          • Peering → conexiones directas entre pares de VPCs.
          • Transit Gateway → un router administrado por AWS que interconecta múltiples VPCs.
          La conectividad real dependerá de las rutas que configures abajo.
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Rutas del router
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Las rutas definen el alcance de la comunicación.
        Conectar una VPC al router no implica acceso automático a otras VPCs:
        debes declarar explícitamente cada CIDR permitido.
      </Typography>

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
              <Typography variant="caption">VPC de origen</Typography>
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
              <Typography variant="caption">VPC destino (opcional)</Typography>
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
              <Typography variant="caption">CIDR destino</Typography>
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
                label="Unidirectional"
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

      <Stack direction="row" gap={1} sx={{ mt: 1 }}>
        <Button variant="outlined" onClick={addRoute} disabled={!canAdd}>
          + Ruta
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleSave} disabled={hasErrors}>
          Guardar
        </Button>
        <Button color="error" onClick={deleteNode}>
          Delete Node
        </Button>
      </Stack>
    </Box>
  );
}
