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
  CircularProgress,
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

const ConfirmDeployDialog = ({
  open,
  onClose,
  validationState,
  validationResult,
  transformedData,
  onValidate,
  onDeploy,
  onViewPlan,
  loadingFlow,
}) => {
  const isValidated = validationState === "success";
  const hasError = validationState === "error";
  const isSyncing =
    validationState === "syncing" || validationState === "planning";

  const vpcs = transformedData?.vpcs || [];

  const renderBanner = () => {
    if (isSyncing) {
      return <Alert severity="info">Validando infraestructura...</Alert>;
    }

    if (isValidated) {
      return (
        <Alert severity="success">
          Infraestructura validada correctamente. Puedes desplegar o revisar el
          plan.
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

    return (
      <Alert severity="warning">
        El canvas cambió desde la última validación. Debes validar nuevamente.
      </Alert>
    );
  };

  const mapTarget = (target) => {
    if (target === "igw") return "Internet Gateway";
    if (target === "nat") return "NAT Gateway";
    if (target === "local") return "Local";
    return target;
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
        {renderBanner()}

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Resumen de infraestructura
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`Cloud: ${transformedData?.cloud || "aws"}`} />
            <Chip label={`VPCs: ${vpcs.length}`} />
            <Chip label={`Subnets: ${totalSubnets}`} />
            <Chip label={`Instancias: ${totalInstances}`} />
          </Stack>
        </Box>

        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Detalle por VPC
          </Typography>

          {vpcs.map((vpc) => (
            <Box
              key={vpc.id}
              mb={3}
              p={2}
              border="1px solid #eee"
              borderRadius={2}
            >
              <Typography variant="subtitle1">{vpc.name}</Typography>

              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                <Chip label={`CIDR: ${vpc.cidr_block}`} />
                <Chip label={`Región: ${vpc.region}`} />
                {vpc.internet_gateway && (
                  <Chip label="IGW habilitado" color="primary" />
                )}
                {vpc.nat_gateway?.enabled && (
                  <Chip label="NAT habilitado" color="secondary" />
                )}
              </Stack>

              <Box mt={2}>
                <Typography variant="subtitle2">
                  Tablas de rutas
                </Typography>

                {vpc.route_tables?.map((rt) => (
                  <Box key={rt.name} mt={1} ml={2}>
                    <Typography variant="body2">
                      Tabla: {rt.name}
                    </Typography>

                    {rt.routes?.map((route, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        sx={{ ml: 2 }}
                      >
                        {route.dest_cidr} → {mapTarget(route.target)}
                      </Typography>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
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
