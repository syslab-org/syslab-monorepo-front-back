// apps/frontend/src/components/flow/ConfirmDeployDialog.jsx
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField
} from "@mui/material";

export default function ConfirmDeployDialog({
  open,
  onClose,
  onConfirm,
  planName,
  setPlanName,
  simulateOnly,
  setSimulateOnly,
  transformedData
}) {
  // datos rápidos del payload (por si quieres mostrar algo breve)
  const vpcs = Array.isArray(transformedData?.vpcs) ? transformedData.vpcs : [];
  const vpc = vpcs[0] || null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirmar despliegue</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Nombre del Plan"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="p.ej. VPC-A"
          />

          <FormControlLabel
            control={
              <Switch
                checked={simulateOnly}
                onChange={(e) => setSimulateOnly(e.target.checked)}
              />
            }
            label="Simular solamente (solo terraform plan, sin aplicar cambios)"
          />

          {vpc && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" label={`Cloud: ${transformedData?.cloud || "aws"}`} />
                <Chip size="small" label={`VPC: ${vpc.name || "(sin nombre)"}`} />
                {vpc.cidr_block && <Chip size="small" label={`CIDR: ${vpc.cidr_block}`} />}
                {vpc.region && <Chip size="small" label={`Región/AZ: ${vpc.region}`} />}
                <Chip size="small" label={`Subnets: ${Array.isArray(vpc.subnets) ? vpc.subnets.length : 0}`} />
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          {simulateOnly ? "Validar (plan)" : "Desplegar (apply)"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
