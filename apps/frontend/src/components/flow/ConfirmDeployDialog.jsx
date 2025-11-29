// apps/frontend/src/components/flow/ConfirmDeployDialog.jsx
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import DeployConfirmationRoutes from "./panels/DeployConfirmationRoutes";

/**
 * Exporta el plan actual (transformedData) a un archivo JSON descargable.
 */
function exportPlanToJson(transformedData, planName = "plan-export") {
  try {
    const blob = new Blob([JSON.stringify(transformedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `${planName.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exportando el plan:", error);
    alert("No se pudo exportar el plan. Revisa la consola.");
  }
}

export default function ConfirmDeployDialog({
  open,
  onClose,
  onConfirm,                // si quieres pasar el override al confirmar: onConfirm(allowCrossVpcPingUI)
  planName,
  setPlanName,
  simulateOnly,
  setSimulateOnly,
  transformedData,
  allowCrossVpcPingUI,      // <- controlado por el padre
  setAllowCrossVpcPingUI,   // <- setter del padre
}) {
  const allowRealApply = import.meta.env.VITE_ALLOW_REAL_APPLY === "1";

  // Normalización segura
  const vpcs = Array.isArray(transformedData?.vpcs) ? transformedData.vpcs : [];
  const links = Array.isArray(transformedData?.links) ? transformedData.links : [];
  const vlan = transformedData?.vlan || {};

  // Totales del plan
  const totalVpcs = vpcs.length;
  const totalSubnets = vpcs.reduce(
    (acc, vpc) => acc + (vpc.subnets?.length || 0),
    0
  );
  const totalInstances = vpcs.reduce(
    (acc, vpc) =>
      acc +
      (vpc.subnets?.reduce((a, sn) => a + (sn.instances?.length || 0), 0) || 0),
    0
  );
  const totalNat = vpcs.filter((v) => v.nat_gateway?.enabled).length;
  const totalIgw = vpcs.filter((v) => v.internet_gateway).length;
  const totalRouters = links.reduce((acc, l) => {
    const id = l.via_router_id;
    return id ? acc.add(id) : acc;
  }, new Set()).size;

  // Chip de estado del override (true/false/null)
  const pingStatusChip = useMemo(() => {
    if (allowCrossVpcPingUI === true) {
      return (
        <Chip
          size="small"
          color="success"
          label="Ping entre VPCs: Activado (override)"
        />
      );
    }
    if (allowCrossVpcPingUI === false) {
      return (
        <Chip
          size="small"
          color="error"
          label="Ping entre VPCs: Desactivado (override)"
        />
      );
    }
    return (
      <Chip
        size="small"
        variant="outlined"
        label="Ping entre VPCs: Automático"
      />
    );
  }, [allowCrossVpcPingUI]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Confirmar despliegue</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* ---- Nombre del plan ---- */}
          <TextField
            fullWidth
            label="Nombre del Plan"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="p.ej. red-principal"
          />

          {/* ---- Toggle Simulación / Apply ---- */}
          <FormControlLabel
            control={
              <Switch
                disabled={!allowRealApply}
                checked={!simulateOnly}
                onChange={(e) => setSimulateOnly(!e.target.checked)}
              />
            }
            label={
              allowRealApply
                ? "Apply real (Terraform apply)"
                : "Apply real (bloqueado por entorno)"
            }
          />

          {/* ---- Switch de ping entre VPCs (override opcional) ---- */}
          <Box
            sx={{
              p: 1.5,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              borderRadius: 1.5,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              flexWrap="wrap"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={allowCrossVpcPingUI === true}
                    onChange={(e) =>
                      setAllowCrossVpcPingUI(e.target.checked ? true : false)
                    }
                  />
                }
                label={<Typography variant="body2">Permitir ping entre VPCs (override)</Typography>}
              />

              <Stack direction="row" spacing={1} alignItems="center">
                {pingStatusChip}
                <Tooltip title="Volver a modo automático (no forzar)">
                  <span>
                    <IconButton
                      onClick={() => setAllowCrossVpcPingUI(null)}
                      size="small"
                      aria-label="Restablecer a automático"
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Si no cambias este control o presionas <b>“restablecer”</b>, el sistema usará el
              comportamiento <b>automático</b> (se decide según enlaces entre VPCs o flags en routers).
            </Typography>
          </Box>

          {/* ---- Mensajes contextuales ---- */}
          {!allowRealApply && (
            <Typography variant="body2" color="text.secondary">
              Para habilitar el apply real, define <code>VITE_ALLOW_REAL_APPLY=1</code> en el entorno del frontend.
            </Typography>
          )}

          {!simulateOnly && (
            <Typography variant="body2" sx={{ color: "#b45309" }}>
              ⚠️ Esto ejecutará un <b>Terraform apply</b> real en AWS. Asegúrate de tener credenciales IAM válidas.
            </Typography>
          )}

          {/* ---- Resumen global ---- */}
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="h6">Resumen general del plan</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1.2} sx={{ mt: 1 }}>
            <Chip size="small" color="primary" label={`Cloud: ${transformedData?.cloud || "aws"}`} />
            <Chip size="small" label={`VLAN: ${vlan?.name || "no definida"}`} />
            {vlan?.region && <Chip size="small" label={`Región: ${vlan.region}`} />}
            {vlan?.master_cidr && <Chip size="small" label={`CIDR maestro: ${vlan.master_cidr}`} />}
            <Chip size="small" label={`VPCs: ${totalVpcs}`} />
            <Chip size="small" label={`Subnets: ${totalSubnets}`} />
            <Chip size="small" label={`Instancias: ${totalInstances}`} />
            <Chip size="small" label={`Routers: ${totalRouters}`} />
            <Chip
              size="small"
              color={totalIgw ? "info" : "default"}
              label={`Internet Gateways: ${totalIgw}`}
            />
            <Chip
              size="small"
              color={totalNat ? "warning" : "default"}
              label={`NAT Gateways: ${totalNat}`}
            />
            {pingStatusChip}
          </Stack>

          {/* ---- Botón de exportar plan ---- */}
          {transformedData && (
            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => exportPlanToJson(transformedData, planName)}
              >
                Exportar plan a JSON
              </Button>
              <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                Guarda una copia local del plan antes de ejecutar el deploy.
              </Typography>
            </Box>
          )}

          {/* ---- Detalle por VPC ---- */}
          {vpcs.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Detalle por VPC</Typography>

              {vpcs.map((vpc) => (
                <Box key={vpc.id} sx={{ mt: 1.5 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    flexWrap="wrap"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="subtitle1">
                      {vpc.name || "(sin nombre)"}
                    </Typography>
                    {vpc.cidr_block && (
                      <Chip size="small" variant="outlined" label={`CIDR: ${vpc.cidr_block}`} />
                    )}
                    {vpc.region && (
                      <Chip size="small" variant="outlined" label={`Región: ${vpc.region}`} />
                    )}
                    {vpc.internet_gateway && (
                      <Chip size="small" color="info" label="IGW habilitado" />
                    )}
                    {vpc.nat_gateway?.enabled && (
                      <Chip size="small" color="warning" label="NAT habilitado" />
                    )}
                    <Chip size="small" label={`Subnets: ${vpc.subnets?.length || 0}`} />
                    <Chip
                      size="small"
                      label={`Instancias: ${vpc.subnets?.reduce((a, sn) => a + (sn.instances?.length || 0), 0) || 0
                        }`}
                    />
                  </Stack>
                </Box>
              ))}

              {/* ---- Tablas de rutas ---- */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Tablas de rutas generadas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Revisa las rutas locales, NAT, Internet Gateway y peering antes de confirmar el despliegue.
              </Typography>
              <DeployConfirmationRoutes vpcs={vpcs} />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => onConfirm?.(allowCrossVpcPingUI)}
          variant="contained"
          color="primary"
        >
          {simulateOnly ? "Validar (plan)" : "Desplegar (apply)"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
