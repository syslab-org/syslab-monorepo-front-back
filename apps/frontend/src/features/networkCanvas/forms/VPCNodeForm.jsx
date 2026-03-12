// apps/frontend/src/components/flow/forms/VPCNodeForm.jsx
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { VPC_CHILD_FORM, } from "@/features/networkCanvas/utils/constants";
import { useFormValidationSchema } from "./validations/useFormValidations";

const VPCNodeForm = ({
  nodeData,
  onSave,
  deleteNode,
  vlanCidr, // "10.0.0.0/16"
  siblingVpcCidrs = [], // ["10.0.1.0/24", ...]
  defaultRegion = "us-east-1",
  publicSubnetNames = [], // nombres de subnets públicas en esta VPC
}) => {
  const validationSchema = useFormValidationSchema(
    VPC_CHILD_FORM,
    null,
    null,
    { vlanCidr, siblingVpcCidrs },
    true
  );

  const hasPublicSubnets = useMemo(
    () => Array.isArray(publicSubnetNames) && publicSubnetNames.length > 0,
    [publicSubnetNames]
  );

  // ⚙️ FEATURE FLAG (por si algún día quieres permitir encender el switch aunque no haya subnets públicas)
  // Si pones esta constante en true, el switch no se bloqueará al encenderse; solo mostrará warnings.
  const ALLOW_ENABLE_NAT_WITHOUT_PUBLIC_SUBNETS = false;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      vpcName: nodeData?.vpcName || "",
      region: nodeData?.region || defaultRegion, // ej: "us-east-1"
      cidrBlock:
        nodeData?.cidrBlock && nodeData?.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData?.internetGateway ?? false,
      allowedSshCidr: nodeData?.allowedSshCidr || "",

      // NAT
      enableNatGateway: nodeData?.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData?.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData?.natGatewayElasticIp || "",
    },
  });

  // Snackbar llamativo
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("info"); // "success" | "info" | "warning" | "error"

  const enableNat = watch("enableNatGateway");
  const natSubnet = watch("natGatewayPublicSubnet");
  const internetGatewayEnabled = watch("internetGateway");
  const allowedSshCidr = watch("allowedSshCidr");

  // Cuando cambia el nodeData (o props clave), refresca el form SIN perder NAT fields
  useEffect(() => {
    reset({
      vpcName: nodeData?.vpcName || "",
      region: nodeData?.region || defaultRegion,
      cidrBlock:
        nodeData?.cidrBlock && nodeData?.prefixLength
          ? `${nodeData.cidrBlock}/${nodeData.prefixLength}`
          : "",
      internetGateway: nodeData?.internetGateway ?? false,
      allowedSshCidr: nodeData?.allowedSshCidr || "",

      // Preserva NAT del nodo
      enableNatGateway: nodeData?.enableNatGateway ?? false,
      natGatewayPublicSubnet: nodeData?.natGatewayPublicSubnet || "",
      natGatewayElasticIp: nodeData?.natGatewayElasticIp || "",
    });
  }, [nodeData, reset, defaultRegion]);

  // Al cambiar el estado de NAT o la disponibilidad de subnets públicas:
  // - Si NAT está activo y hay subnets públicas pero no hay seleccionada → autoselecciona la primera + snackbar
  // - Si NAT está activo y NO hay subnets públicas → snackbar de advertencia
  useEffect(() => {
    if (enableNat && hasPublicSubnets && !natSubnet) {
      const auto = publicSubnetNames[0];
      setValue("natGatewayPublicSubnet", auto, { shouldValidate: true });
      setSnackMsg(
        `Se seleccionó automáticamente la subnet pública “${auto}” para el NAT.`
      );
      setSnackSeverity("info");
      setSnackOpen(true);
    }

    if (enableNat && !hasPublicSubnets) {
      setSnackMsg(
        "No hay subnets públicas disponibles para asignar NAT Gateway."
      );
      setSnackSeverity("warning");
      setSnackOpen(true);
    }
  }, [
    enableNat,
    hasPublicSubnets,
    natSubnet,
    publicSubnetNames,
    setValue,
  ]);

  const onSubmit = (data) => {
    // Bloqueo extra por UX: si NAT está activo, exige subnet pública
    if (data.enableNatGateway && (!hasPublicSubnets || !data.natGatewayPublicSubnet)) {
      setSnackMsg(
        "Debes seleccionar una subnet pública para el NAT antes de guardar."
      );
      setSnackSeverity("warning");
      setSnackOpen(true);
      return;
    }

    const [base, prefix] = (data.cidrBlock || "").split("/");

    const payload = {
      // existentes
      vpcName: data.vpcName,
      region: data.region,
      cidrBlock: base,
      prefixLength: Number(prefix),
      internetGateway: data.internetGateway,
      allowedSshCidr: data.allowedSshCidr || "",

      // NAT (camelCase para el builder)
      enableNatGateway: !!data.enableNatGateway,
      natGatewayPublicSubnet: data.natGatewayPublicSubnet || "",
      natGatewayElasticIp: (data.natGatewayElasticIp || "").trim(),

      // snake_case (opcional)
      nat_gateway: {
        enabled: !!data.enableNatGateway,
        public_subnet: data.natGatewayPublicSubnet || "",
        elastic_ip: (data.natGatewayElasticIp || "").trim(),
      },
    };

    onSave(payload);
  };

  const disableSubmitForNat =
    enableNat && (!hasPublicSubnets || !natSubnet || natSubnet === "");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">network segment</Typography>
        <Typography className="pt-node-form__title">Network Segment</Typography>
        <Typography className="pt-node-form__subtitle">
          Define address space, internet exposure and egress behavior for this segment. AWS translation: VPC.
        </Typography>
      </Box>
      {/* Snackbar vistoso */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={5000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>

      {/* VPC Name */}
      <TextField
        label="VPC Name"
        {...register("vpcName")}
        error={!!errors.vpcName}
        helperText={errors.vpcName?.message}
        fullWidth
        margin="normal"
      />

      {/* CIDR VPC */}
      <TextField
        label={`VPC's CIDR Block (inside of ${vlanCidr || "VLAN"})`}
        {...register("cidrBlock")}
        error={!!errors.cidrBlock}
        helperText={errors.cidrBlock?.message}
        placeholder="10.30.0.0/20"
        fullWidth
        margin="normal"
      />

      {/* Region */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="vpc-region-label">Region</InputLabel>
        <Select
          labelId="vpc-region-label"
          {...register("region")}
          label="Region"
          defaultValue={defaultRegion}
        >
          <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
          <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
          <MenuItem value="eu-west-1">EU (Ireland)</MenuItem>
        </Select>
        {errors.region && (
          <FormHelperText error>{errors.region.message}</FormHelperText>
        )}
      </FormControl>

      {/* Internet Gateway */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="igw-label">Internet Gateway</InputLabel>
        <Select
          labelId="igw-label"
          label="Internet Gateway"
          {...register("internetGateway")}
          defaultValue={nodeData?.internetGateway ?? false}
        >
          <MenuItem value={true}>Enabled</MenuItem>
          <MenuItem value={false}>Disabled</MenuItem>
        </Select>
        {errors.internetGateway && (
          <FormHelperText error>
            {errors.internetGateway.message}
          </FormHelperText>
        )}
      </FormControl>

      <Alert severity="info" variant="outlined" sx={{ mt: 1, mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Qué significa este segmento
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.4 }}>
          - El CIDR define el rango principal de la red.
        </Typography>
        <Typography variant="caption" display="block">
          - IGW habilita salida pública directa donde existan rutas adecuadas.
        </Typography>
        <Typography variant="caption" display="block">
          - NAT da salida a subnets privadas, pero no acceso entrante desde Internet.
        </Typography>
        <Typography variant="caption" display="block">
          - Si defines una Elastic IP para NAT, debe ser un Allocation ID real de AWS (`eipalloc-...`), no una IP pública.
        </Typography>
        <Typography variant="caption" display="block">
          - Allowed SSH CIDR abre TCP/22 solo desde la IP o red que indiques.
        </Typography>
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip
          size="small"
          label={internetGatewayEnabled ? "AWS: crea IGW" : "AWS: sin IGW"}
          color={internetGatewayEnabled ? "primary" : "default"}
          variant={internetGatewayEnabled ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          label={enableNat ? "AWS: crea NAT" : "AWS: sin NAT"}
          color={enableNat ? "warning" : "default"}
          variant={enableNat ? "filled" : "outlined"}
        />
        <Chip
          size="small"
          label={allowedSshCidr ? "Seguridad: SSH expuesto a CIDR" : "Seguridad: sin SSH externo"}
          color={allowedSshCidr ? "info" : "default"}
          variant={allowedSshCidr ? "filled" : "outlined"}
        />
      </Stack>

      {/* ---- NAT Gateway ---- */}
      <Box sx={{ mt: 1.5, mb: 0.5 }}>
        {!hasPublicSubnets && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            No hay subnets públicas en esta VPC. Crea una para poder habilitar
            el NAT Gateway.
          </Alert>
        )}

        <Controller
          name="enableNatGateway"
          control={control}
          render={({ field: { value, onChange } }) => {
            const willBlockTurnOn =
              !ALLOW_ENABLE_NAT_WITHOUT_PUBLIC_SUBNETS &&
              !hasPublicSubnets &&
              !value;

            return (
              <Tooltip
                arrow
                placement="top"
                title={
                  willBlockTurnOn
                    ? "Crea primero una subnet pública para habilitar NAT Gateway."
                    : ""
                }
              >
                <span>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!value}
                        onChange={(_, checked) => {
                          // Bloquea encendido si no hay públicas (salvo feature flag)
                          if (willBlockTurnOn && checked) {
                            setSnackMsg(
                              "Primero crea una subnet pública para habilitar NAT Gateway."
                            );
                            setSnackSeverity("warning");
                            setSnackOpen(true);
                            return;
                          }
                          onChange(checked);
                        }}
                        disabled={willBlockTurnOn}
                      />
                    }
                    label="Enable NAT Gateway"
                  />
                </span>
              </Tooltip>
            );
          }}
        />
      </Box>

      {/* Select de Public Subnet para el NAT */}
      <FormControl
        fullWidth
        margin="normal"
        disabled={!enableNat || !hasPublicSubnets}
        error={!!errors.natGatewayPublicSubnet}
      >
        <InputLabel id="nat-subnet-label">Public Subnet for NAT</InputLabel>
        <Controller
          name="natGatewayPublicSubnet"
          control={control}
          render={({ field }) => (
            <Select
              labelId="nat-subnet-label"
              label="Public Subnet for NAT"
              {...field}
              value={field.value || ""}
            >
              <MenuItem value="">
                <em>Selecciona una subnet pública</em>
              </MenuItem>
              {publicSubnetNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {!hasPublicSubnets && (
          <FormHelperText>
            Crea primero una Subnet pública en esta VPC para alojar el NAT.
          </FormHelperText>
        )}
        {errors.natGatewayPublicSubnet && (
          <FormHelperText>{errors.natGatewayPublicSubnet.message}</FormHelperText>
        )}
      </FormControl>

      {/* EIP opcional */}
      <TextField
        label="Elastic IP Allocation ID (opcional)"
        {...register("natGatewayElasticIp")}
        placeholder="eipalloc-0123456789abcdef0"
        helperText={
          enableNat
            ? "Si la dejas vacía, AWS asignará una Elastic IP nueva. Si ya tienes una reservada, ingresa su Allocation ID real (`eipalloc-...`), no la IP pública."
            : "Solo aplica si habilitas NAT Gateway."
        }
        fullWidth
        margin="normal"
        disabled={!enableNat}
      />

      {/* Allowed SSH */}
      <TextField
        label="Allowed SSH CIDR (opcional)"
        {...register("allowedSshCidr")}
        error={!!errors.allowedSshCidr}
        helperText={
          errors.allowedSshCidr?.message ||
          "Ej: 203.0.113.5/32. Esto crea una regla del Security Group para permitir SSH desde tu IP pública."
        }
        placeholder="203.0.113.5/32"
        fullWidth
        margin="normal"
      />

      {/* Botones */}
      <Box className="pt-node-form__actions">
        <Tooltip
          arrow
          disableHoverListener={!disableSubmitForNat}
          title={
            disableSubmitForNat
              ? "Selecciona una subnet pública para el NAT antes de guardar."
              : ""
          }
        >
          <span>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={disableSubmitForNat}
            >
              Registrar Configuración
            </Button>
          </span>
        </Tooltip>

        <Button onClick={deleteNode} color="error">
          Delete Node
        </Button>

        {/* Pista visual pequeña cuando el botón está deshabilitado */}
        {disableSubmitForNat && (
          <Typography variant="caption" sx={{ color: "warning.main", ml: 1.5 }}>
            Debes seleccionar una subnet pública para el NAT.
          </Typography>
        )}
      </Box>
    </form>
  );
};

export default VPCNodeForm;
