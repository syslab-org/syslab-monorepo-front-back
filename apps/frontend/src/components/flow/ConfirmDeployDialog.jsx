// apps/frontend/src/components/flow/ConfirmDeployDialog.jsx
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
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
  onConfirm, //Legacy: (allowCrossVpcPing) => void
  onValidatePlan,
  onApplyReal,
  onOpenPlanDetails, // (planId?: string) => void
  validationState = "idle", // idle | syncing | planning | success | error
  validationError = null,
  validationResult = null,
  planName,
  setPlanName,
  simulateOnly,
  setSimulateOnly,
  transformedData,
  allowCrossVpcPingUI,
  setAllowCrossVpcPingUI,
  existingPlanId = null,
}) {
  const allowRealApply = import.meta.env.VITE_ALLOW_REAL_APPLY === "1";
  console.log("existingPlanId:", existingPlanId);
  // Normalización segura
  const effectivePlanId = existingPlanId ?? validationResult?.plan_id ?? null;
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
          {/* ---- Plan asociado al canvas (si existe) ---- */}
          {effectivePlanId ? (
            <Alert
              severity="info"
              variant="outlined"
              action={
                <Button
                  size="small"
                  onClick={() => onOpenPlanDetails?.(effectivePlanId)}
                >
                  Ver plan existente
                </Button>
              }
            >
              Este canvas ya tiene un plan asociado (ID: {effectivePlanId}).
              El nombre del plan es inmutable y no puede modificarse.
            </Alert>
          ) : null}
          {/* ---- Estado de validación (2 fases) ---- */}
          {validationState === "syncing" && (
            <Alert severity="info" variant="filled">
              Sincronizando plan con backend…
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Detectando si existe un plan previo asociado al canvas.
              </Typography>
            </Alert>
          )}
          {validationState === "planning" && (
            <Alert severity="info" variant="filled">Ejecutando validación (Terraform plan)…</Alert>
          )}
          {validationState === "success" && (
            <Alert severity="success" variant="filled">
              Validación OK. Puedes aplicar (deploy real) o ver detalles.
            </Alert>
          )}
          {validationState === "error" && (
            <Alert severity="error" variant="filled">
              {validationError || "Validación fallida."}
              {effectivePlanId ? (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  Plan asociado: {effectivePlanId}
                </Typography>
              ) : null}
            </Alert>
          )}
          {validationState === "idle" && !existingPlanId && (
            <Typography variant="body2" color="text.secondary">
              Aún no has validado este plan con el backend.
            </Typography>
          )}


          {/* ---- Nombre del plan ---- */}
          <TextField
            fullWidth
            label="Nombre del Plan"
            value={planName}
            onChange={(e) => {
              if (!effectivePlanId) {
                setPlanName(e.target.value);
              }
            }}
            placeholder="p.ej. red-principal"
            disabled={!!effectivePlanId}
            helperText={
              effectivePlanId
                ? "Este plan ya fue creado y su nombre no puede modificarse."
                : "Puedes definir el nombre antes de validar el plan."
            }
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

          {/* ---- Ping entre VPCs (override opcional) ---- */}
          <Box
            sx={{
              p: 1.5,
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              borderRadius: 1.5,
            }}
          >
            <Stack spacing={1}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                flexWrap="wrap"
              >
                <Typography variant="body2">Ping entre VPCs</Typography>
                {pingStatusChip}
              </Stack>

              <ToggleButtonGroup
                size="small"
                exclusive
                value={allowCrossVpcPingUI}
                onChange={(_e, next) => {
                  // `next` puede ser null si clickean el botón activo; evitamos dejarlo vacío.
                  if (next === null) return;
                  setAllowCrossVpcPingUI(next);
                }}
              >
                <ToggleButton value={null}>Automático</ToggleButton>
                <ToggleButton value={true}>Activado</ToggleButton>
                <ToggleButton value={false}>Desactivado</ToggleButton>
              </ToggleButtonGroup>

              <Typography variant="caption" color="text.secondary">
                Automático = se decide según enlaces (peering/TGW) o flags del payload. Override = fuerzas el
                comportamiento explícitamente.
              </Typography>
            </Stack>
          </Box>

          {/* ---- Mensajes contextuales ---- */}
          {!allowRealApply && (
            <Typography variant="body2" color="text.secondary">
              Para habilitar el apply real, define <code>VITE_ALLOW_REAL_APPLY=1</code> en el entorno del frontend.
            </Typography>
          )}

          {!simulateOnly && (
            <Typography variant="body2" sx={{ color: (theme) => theme.palette.warning.main }}>
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
          onClick={() => onValidatePlan?.(allowCrossVpcPingUI)}
          variant="contained"
          color="primary"
          disabled={validationState === "syncing" || validationState === "planning"}
        >
          Validar (plan)
        </Button>

        {validationState !== "success" && effectivePlanId && (
          <Button
            onClick={() => onOpenPlanDetails?.(effectivePlanId)}
            variant="outlined"
          >
            Ver plan existente
          </Button>
        )}

        {validationState === "success" && (
          <>
            <Button
              onClick={() => onOpenPlanDetails?.(effectivePlanId)}
              variant="outlined"
            >
              Ver plan
            </Button>

            <Button
              onClick={() => onApplyReal?.(allowCrossVpcPingUI)}
              variant="contained"
              color="warning"
              disabled={!allowRealApply || simulateOnly}
            >
              {simulateOnly ? "Desplegar (apply) — activa Apply real" : "Desplegar (apply)"}
            </Button>
          </>
        )}

        {/* fallback legacy */}
        {validationState === "idle" && !onValidatePlan && (
          <Button
            onClick={() => onConfirm?.(allowCrossVpcPingUI)}
            variant="contained"
            color="primary"
          >
            {simulateOnly ? "Validar (plan)" : "Desplegar (apply)"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
