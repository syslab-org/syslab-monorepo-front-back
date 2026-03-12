import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HubIcon from "@mui/icons-material/Hub";
import LanIcon from "@mui/icons-material/Lan";
import PublicIcon from "@mui/icons-material/Public";
import RouteIcon from "@mui/icons-material/Route";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { validateTopology } from "../utils/topologyValidation";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(1100px, 92vw)",
  maxHeight: "82vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 2,
  p: 2.5,
  overflow: "hidden",
};

/**
 * Devuelve el estilo visual para cada tipo de target (ruta)
 */
const routeChip = (target) => {
  switch (target) {
    case "local":
      return (
        <Chip
          icon={<LanIcon />}
          label="local"
          color="success"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "igw":
      return (
        <Chip
          icon={<PublicIcon />}
          label="Internet Gateway"
          color="info"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "nat-gw":
      return (
        <Chip
          icon={<CloudUploadIcon />}
          label="NAT Gateway"
          color="warning"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "peering":
      return (
        <Chip
          icon={<RouteIcon />}
          label="Peering"
          color="secondary"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    case "tgw":
      return (
        <Chip
          icon={<HubIcon />}
          label="Transit Gateway"
          color="primary"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
    default:
      return (
        <Chip
          label={target || "unknown"}
          color="default"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      );
  }
};

export default function RoutePreviewPanel({ open, onClose, nodes, edges }) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [validated, setValidated] = useState(false);

  const preview = useMemo(() => buildRoutingPreview(nodes, edges), [nodes, edges]);
  const previewWarnings = useMemo(
    () =>
      (preview?.warnings || []).map(
        (warning) =>
          warning?.message ||
          `Router ${warning?.router_id || "n/a"}: ${warning?.from_vpc || "?"} → ${warning?.to_vpc || "?"}`,
      ),
    [preview],
  );
  const allWarnings = useMemo(() => {
    const merged = [...warnings, ...previewWarnings].filter(Boolean);
    return Array.from(new Set(merged));
  }, [warnings, previewWarnings]);

  useEffect(() => {
    if (!open) return;
    const { errors: e, warnings: w } = validateTopology(nodes, edges);
    setErrors(e);
    setWarnings(w);
    setValidated(false);
  }, [open, nodes, edges]);

  const runValidation = () => {
    const { errors: e, warnings: w } = validateTopology(nodes, edges);
    setErrors(e);
    setWarnings(w);
    setValidated(true);
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="routes-preview-title">
      <Box sx={style}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography id="routes-preview-title" variant="h6">
            Preview de rutas por VPC
          </Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          Visualiza cómo se traduce el enrutamiento del laboratorio a AWS (Peering o TGW), con implicancias por router y conectividad esperada.
        </Typography>

        <Stack direction="row" gap={1} sx={{ mb: 1 }}>
          <Button variant="contained" onClick={runValidation}>
            {validated ? "Revalidar rutas" : "Validar rutas"}
          </Button>
          <Chip label={`warnings: ${allWarnings.length}`} color="warning" size="small" variant={allWarnings.length ? "filled" : "outlined"} />
          <Chip label={`errores: ${errors.length}`} color="error" size="small" variant={errors.length ? "filled" : "outlined"} />
        </Stack>

        <Box sx={{ maxHeight: "64vh", overflowY: "auto", pr: 1 }}>
          {validated && errors.length === 0 && (
            <Alert severity="success" sx={{ mb: 1.5 }}>
              ✅ Todo en orden para el deploy. No se detectaron errores.
              {allWarnings.length > 0 && " Hay advertencias no bloqueantes."}
            </Alert>
          )}

          {errors.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Alert severity="error" sx={{ mb: 1 }}>
                Corrige estos errores antes del deploy:
              </Alert>
              <Stack gap={0.5}>
                {errors.map((e, i) => (
                  <Typography key={i} variant="body2">• {e}</Typography>
                ))}
              </Stack>
            </Box>
          )}

          {allWarnings.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>
                Advertencias (no bloquean el deploy):
              </Alert>
              <Stack gap={0.5}>
                {allWarnings.map((w, i) => (
                  <Typography key={i} variant="body2">• {w}</Typography>
                ))}
              </Stack>
            </Box>
          )}

          {(preview?.routers || []).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Cómo se implementará cada router en AWS
              </Typography>
              <Stack spacing={1}>
                {preview.routers.map((router) => (
                  <Box
                    key={router.id}
                    sx={{
                      p: 1.2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" sx={{ fontWeight: 700, mr: "auto" }}>
                        {router.name}
                      </Typography>
                      {routeChip(router.mode)}
                      <Chip
                        size="small"
                        label={`VPCs conectadas: ${router.connectedCount}`}
                        variant="outlined"
                      />
                      {router.mode === "peering" ? (
                        <Chip
                          size="small"
                          label={`Peerings listos: ${router.awsResources?.peerings || 0}`}
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label={`Attachments TGW: ${router.awsResources?.attachments || 0}`}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.6 }}>
                      Rutas explícitas: {router.explicitRoutes} • Bidireccionales: {router.bidirectionalPairs} • Solo ida: {router.oneWayPairs}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {(preview?.connectivityPairs || []).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Matriz pedagógica de conectividad esperada
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Par de VPCs</TableCell>
                    <TableCell>Modo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Lectura</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.connectivityPairs.map((pair) => (
                    <TableRow key={`${pair.aId}:${pair.bId}`}>
                      <TableCell>
                        <Typography variant="body2">
                          {pair.aName} ↔ {pair.bName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {pair.mode ? routeChip(pair.mode) : <Chip size="small" label="Sin modo" variant="outlined" />}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            pair.status === "reachable"
                              ? "Bidireccional"
                              : pair.status === "partial"
                                ? "Parcial"
                                : "Sin ruta"
                          }
                          color={
                            pair.status === "reachable"
                              ? "success"
                              : pair.status === "partial"
                                ? "warning"
                                : "default"
                          }
                          variant={pair.status === "isolated" ? "outlined" : "filled"}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {pair.reason}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          {(preview?.vpcs || []).map(vpc => (
            <Accordion key={vpc.id} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" gap={1} alignItems="center" sx={{ width: "100%", pr: 2 }}>
                  <Typography variant="subtitle1" sx={{ mr: "auto" }}>{vpc.name}</Typography>
                  <Chip size="small" label={vpc.region || "region n/a"} />
                  <Chip size="small" label={vpc.cidr || "CIDR n/a"} variant="outlined" />
                  <Chip size="small" label={`routers: ${(vpc.connectedRouters || []).length}`} variant="outlined" />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Tabla de rutas: <b>main</b>
                </Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Destino (CIDR)</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>via_router_id</TableCell>
                      <TableCell>Direccionalidad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(vpc.main_route_table || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell><Typography variant="body2">{r.dest_cidr}</Typography></TableCell>
                        <TableCell>{routeChip(r.target)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: r.via_router_id ? "text.primary" : "text.disabled" }}>
                            {r.via_router_id || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.directionality === "missing-return" ? (
                            <Chip size="small" color="warning" label="Falta retorno" />
                          ) : r.directionality === "bidirectional" ? (
                            <Chip size="small" color="success" label="Ida y vuelta" />
                          ) : r.directionality === "manual-cidr" ? (
                            <Chip size="small" variant="outlined" label="CIDR manual" />
                          ) : (
                            <Chip size="small" variant="outlined" label="N/A" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!vpc.main_route_table || vpc.main_route_table.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary">Sin rutas calculadas para esta VPC.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          ))}

          {(preview?.vpcs || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No hay VPCs en el canvas.
            </Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
