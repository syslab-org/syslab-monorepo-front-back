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
  Stack,
  Typography,
} from "@mui/material";

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

const ConfirmDeployDialog = ({
  open,
  onClose,
  validationState,
  canvasState,
  validationResult,
  transformedData,
  onValidate,
  onDeploy,
  onViewPlan,
  loadingFlow,
}) => {
  const isValidated = validationState === "SUCCESS";
  const hasError = validationState === "ERROR";
  const isSyncing =
    validationState === "SYNCING" ||
    validationState === "PLANNING";

  const vpcs = transformedData?.vpcs || [];

  const renderBanner = () => {
    if (isSyncing) {
      return <Alert severity="info">Validando infraestructura...</Alert>;
    }

    if (isValidated) {
      return (
        <Alert severity="success">
          Infraestructura validada correctamente. Puedes desplegar o revisar el plan.
        </Alert>
      );
    }

    if (hasError) {
      return (
        <Alert severity="error">
          Error durante la validación. Revisa los detalles antes de continuar.
        </Alert>
      );
    }

    // ⚠️ Mostrar advertencia SOLO si el canvas realmente está desactualizado
    if (canvasState === "PLAN_OUTDATED") {
      return (
        <Alert severity="warning">
          El canvas cambió desde la última validación. Debes validar nuevamente.
        </Alert>
      );
    }

    // En cualquier otro caso no mostramos banner
    return null;
  };

  const totalSubnets = vpcs.reduce(
    (acc, v) => acc + (v.subnets?.length || 0),
    0
  );
  const totalInstances = vpcs.reduce(
    (acc, v) =>
      acc +
      (v.subnets || []).reduce(
        (subAcc, s) => subAcc + (s.instances?.length || 0),
        0
      ),
    0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Confirmar infraestructura</DialogTitle>
      <DialogContent dividers>
        <Box>
          {renderBanner()}

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Resumen
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Cloud: ${transformedData?.cloud || "aws"}`} />
              <Chip label={`VPCs: ${vpcs.length}`} />
              <Chip label={`Subnets: ${totalSubnets}`} />
              <Chip label={`Instancias: ${totalInstances}`} />
            </Stack>
          </Box>

          <Box mt={4}>
            {vpcs.map((vpc) => (
              <Box
                key={vpc.id}
                mb={2}
                p={2}
                border="1px solid #eee"
                borderRadius={2}
              >
                <Typography variant="subtitle2">{vpc.name}</Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Chip label={`CIDR: ${vpc.cidr_block}`} size="small" />
                  <Chip label={`Región: ${vpc.region}`} size="small" />
                  {vpc.internet_gateway && (
                    <Chip label="IGW" size="small" color="primary" />
                  )}
                  {vpc.nat_gateway?.enabled && (
                    <Chip label="NAT" size="small" color="secondary" />
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={onValidate}
          disabled={loadingFlow}
        >
          Validar
        </Button>
        <Button
          variant="outlined"
          onClick={() => exportPlanToJson(transformedData, transformedData?.name || "plan")}
          disabled={!transformedData}
        >
          Exportar JSON
        </Button>
        <Button
          variant="outlined"
          onClick={onViewPlan}
          disabled={!validationResult?.plan_id}
        >
          Ver plan
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onDeploy}
          disabled={!isValidated || loadingFlow}
        >
          Desplegar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeployDialog;
