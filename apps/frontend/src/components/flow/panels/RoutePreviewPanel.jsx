/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Modal,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

export default function RoutePreviewPanel({ open, onClose, nodes, edges }) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [validated, setValidated] = useState(false);

  const preview = useMemo(() => buildRoutingPreview(nodes, edges), [nodes, edges]);

  // Valida automáticamente al abrir
  useEffect(() => {
    if (!open) return;
    const { errors: e, warnings: w } = validateTopology(nodes, edges);
    setErrors(e);
    setWarnings(w);
    setValidated(false); // hasta que el usuario toque el botón
  }, [open, nodes, edges]);

  const runValidation = () => {
    const { errors: e, warnings: w } = validateTopology(nodes, edges);
    setErrors(e);
    setWarnings(w);
    setValidated(true);
  };

  const ok = validated && errors.length === 0;

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
          Muestra la tabla de rutas “main” que resultará por cada VPC, incluyendo rutas locales y via router.
        </Typography>

        <Stack direction="row" gap={1} sx={{ mb: 1 }}>
          <Button variant="contained" onClick={runValidation}>
            {validated ? "Revalidar rutas" : "Validar rutas"}
          </Button>
          <Chip label={`warnings: ${warnings.length}`} color="warning" size="small" variant={warnings.length ? "filled" : "outlined"} />
          <Chip label={`errores: ${errors.length}`} color="error" size="small" variant={errors.length ? "filled" : "outlined"} />
        </Stack>

        <Box sx={{ maxHeight: "64vh", overflowY: "auto", pr: 1 }}>
          {validated && errors.length === 0 && (
            <Alert severity="success" sx={{ mb: 1.5 }}>
              ✅ Todo en orden para el deploy (no se detectaron errores).
              {warnings.length > 0 && " Hay advertencias no bloqueantes abajo."}
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

          {warnings.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Alert severity="warning" sx={{ mb: 1 }}>
                Advertencias (no bloquean el deploy):
              </Alert>
              <Stack gap={0.5}>
                {warnings.map((w, i) => (
                  <Typography key={i} variant="body2">• {w}</Typography>
                ))}
              </Stack>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(vpc.main_route_table || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell><Typography variant="body2">{r.dest_cidr}</Typography></TableCell>
                        <TableCell>{r.target === "local" ? <Chip size="small" color="success" label="local" /> : <Chip size="small" color="info" label={r.target} />}</TableCell>
                        <TableCell><Typography variant="body2">{r.via_router_id || "—"}</Typography></TableCell>
                      </TableRow>
                    ))}
                    {(!vpc.main_route_table || vpc.main_route_table.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3}>
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
