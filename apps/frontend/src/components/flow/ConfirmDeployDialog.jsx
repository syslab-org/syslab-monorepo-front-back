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
  TextField,
  Typography
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
  // feature flag (frontend): habilita el apply real
  const allowRealApply = import.meta.env.VITE_ALLOW_REAL_APPLY === "1";

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

          {/* Toggle principal: cuando está ON hacemos apply real (simulateOnly=false) */}
          <FormControlLabel
            control={
              <Switch
                disabled={!allowRealApply}
                checked={!simulateOnly}
                onChange={(e) => setSimulateOnly(!e.target.checked ? true : false)}
              />
            }
            label={
              allowRealApply
                ? "Apply real (Terraform apply)"
                : "Apply real (bloqueado por entorno)"
            }
          />

          {/* Avisos contextuales */}
          {!allowRealApply && (
            <Typography variant="body2" color="text.secondary">
              Para habilitar el apply real en este entorno, define{" "}
              <code>VITE_ALLOW_REAL_APPLY=1</code> en el frontend.
            </Typography>
          )}

          {!simulateOnly && (
            <Typography variant="body2" sx={{ color: "#b45309" }}>
              ⚠️ Esto creará/modificará recursos en AWS. Asegúrate de tener
              credenciales/role válidos. Tu backend ya bloquea apply si no hay
              IAM Role o si <code>ALLOW_LOCAL_APPLY</code> es 0.
            </Typography>
          )}

          {vpc && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" label={`Cloud: ${transformedData?.cloud || "aws"}`} />
                <Chip size="small" label={`VPC: ${vpc.name || "(sin nombre)"}`} />
                {vpc.cidr_block && <Chip size="small" label={`CIDR: ${vpc.cidr_block}`} />}
                {vpc.region && <Chip size="small" label={`Región/AZ: ${vpc.region}`} />}
                <Chip
                  size="small"
                  label={`Subnets: ${Array.isArray(vpc.subnets) ? vpc.subnets.length : 0}`}
                />
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
