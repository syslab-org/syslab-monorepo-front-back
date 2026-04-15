// apps/frontend/src/components/flow/forms/InstanceNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import CidrLearningGuideButton from '@/features/networkCanvas/ui/CidrLearningGuideButton';
import { TYPE_INSTANCE_NODE } from "../utils/constants";
import { INSTANCE_TYPE_OPTIONS } from './options/instanceTypes';
import { useFormValidationSchema } from './validations/useFormValidations';

/**
 * Props:
 *  - nodeData
 *  - onSave(payloadSnakeCase)   // ← enviamos snake_case para TF
 *  - deleteNode
 *  - parentSubnetCidr           // p.ej. "10.10.0.0/24" (valida IPs)
 *  - siblingIpsInSameSubnet     // evita duplicados
 *  - amiList
 *  - defaultAssociatePublicIp   // boolean (opcional). Si omites, por defecto true
 */
const InstanceNodeForm = ({
  nodeData = {},
  onSave,
  deleteNode,
  parentSubnetCidr,
  siblingIpsInSameSubnet = [],
  amiList = [],
  keyPairList = [],
  executionTarget = null,
  defaultAssociatePublicIp = true,
}) => {
  const [mismatchSnackbarOpen, setMismatchSnackbarOpen] = useState(false);
  const validationSchema = useFormValidationSchema(
    TYPE_INSTANCE_NODE,
    parentSubnetCidr,
    null,
    { existingIps: siblingIpsInSameSubnet },
    false
  );

  const amiOptions = useMemo(
    () =>
      (Array.isArray(amiList) ? amiList : [])
        .map((entry) => {
          const code = entry?.code || entry?.metadata?.amiCode || "";
          if (!code) return null;
          return {
            key: entry?.id || code,
            value: code,
            label: entry?.label || code,
            region: entry?.region || entry?.metadata?.region || "",
          };
        })
        .filter(Boolean),
    [amiList]
  );
  const keyPairOptions = useMemo(
    () =>
      (Array.isArray(keyPairList) ? keyPairList : [])
        .map((entry) => {
          const name = String(entry?.name || "").trim();
          if (!name) return null;
          const label = String(entry?.label || "").trim();
          const scopeLabel = entry?.scope === "course_shared" ? "Curso" : "Personal";
          const region = String(entry?.region || "").trim();
          const connectionName = String(entry?.cloud_connection?.name || "").trim();
          const courseName = String(entry?.course?.name || "").trim();
          return {
            id: entry?.id || name,
            value: name,
            label: label || name,
            subtitle: [scopeLabel, region || null, connectionName || courseName || null]
              .filter(Boolean)
              .join(" • "),
          };
        })
        .filter(Boolean),
    [keyPairList]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
      // UI: permitir al usuario forzar/quitar IP pública
      associatePublicIp:
        typeof nodeData.associatePublicIp === "boolean"
          ? nodeData.associatePublicIp
          : defaultAssociatePublicIp,
    }
  });
  const watchedSshAccess = watch("sshAccess");
  const selectedKeyPairMeta = useMemo(() => {
    const current = String(watchedSshAccess || "").trim();
    if (!current) return null;
    return keyPairOptions.find((option) => option.value === current) || null;
  }, [keyPairOptions, watchedSshAccess]);
  const executionScope = String(executionTarget?.scope || "").trim();
  const executionConnectionId = String(executionTarget?.id || "").trim();
  const selectedKeyPairScope = String(
    keyPairList.find((entry) => entry?.name === selectedKeyPairMeta?.value)?.scope || ""
  ).trim();
  const selectedKeyPairConnectionId = String(
    keyPairList.find((entry) => entry?.name === selectedKeyPairMeta?.value)?.cloud_connection?.id || ""
  ).trim();
  const hasScopeMismatch =
    !!selectedKeyPairMeta && !!executionScope && !!selectedKeyPairScope && executionScope !== selectedKeyPairScope;
  const hasConnectionMismatch =
    !!selectedKeyPairMeta &&
    !!executionConnectionId &&
    !!selectedKeyPairConnectionId &&
    executionConnectionId !== selectedKeyPairConnectionId;
  const mismatchSnackbarMessage = hasScopeMismatch
    ? `La key pair seleccionada es ${selectedKeyPairScope}, pero este laboratorio desplegará con una conexión ${executionScope}.`
    : hasConnectionMismatch
      ? "La key pair seleccionada está vinculada a otra conexión cloud. Verifica que exista en la cuenta efectiva del deploy."
      : "";

  useEffect(() => {
    reset({
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
      associatePublicIp:
        typeof nodeData.associatePublicIp === "boolean"
          ? nodeData.associatePublicIp
          : defaultAssociatePublicIp,
    });
  }, [nodeData, reset, defaultAssociatePublicIp]);

  useEffect(() => {
    if (hasScopeMismatch || hasConnectionMismatch) {
      setMismatchSnackbarOpen(true);
    } else {
      setMismatchSnackbarOpen(false);
    }
  }, [hasScopeMismatch, hasConnectionMismatch, mismatchSnackbarMessage]);

  const onSubmit = (data) => {
    const ipRaw = (data.ipAddress || '').trim();
    const amiRaw = (data.ami || '').trim();
    const sshRaw = (data.sshAccess || '').trim();
    const type = (data.instanceType || 't2.micro').trim();
    const name = (data.name || '').trim();

    const ip = !ipRaw || ipRaw.toLowerCase() === 'auto' ? undefined : ipRaw;

    onSave({
      // meta
      type: "instance",

      // nombres
      name,

      // AMI
      ami: amiRaw || undefined,

      // tipo (camel & snake)
      instanceType: type,
      instance_type: type,

      // IP (camel & snake)
      ipAddress: ip,
      ip_address: ip,

      // SSH (camel & snake)
      sshAccess: sshRaw || undefined,
      ssh_access: sshRaw || undefined,
    });
  };

  const renderSectionHeader = (eyebrow, title, helper) => (
    <Box className="pt-node-form__sectionHeader">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip label={eyebrow} size="small" className="pt-node-form__sectionChip" />
        <Typography className="pt-node-form__sectionTitle">{title}</Typography>
      </Stack>
      {helper && (
        <Typography className="pt-node-form__sectionHint">
          {helper}
        </Typography>
      )}
    </Box>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">workload node</Typography>
        <Typography className="pt-node-form__title">Instance</Typography>
        <Typography className="pt-node-form__subtitle">
          Configure naming, addressing and runtime profile for this VM.
        </Typography>
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          "Identidad y red",
          "Nombre e IP privada",
          "Primero define cómo se verá esta VM dentro del segmento y si quieres fijar una IP."
        )}

        <Box className="pt-node-form__grid pt-node-form__grid--two">
          <TextField
            label="Name of Instance"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />

          <TextField
            label={`private IP (inside ${parentSubnetCidr || 'subnet'})`}
            {...register("ipAddress")}
            error={!!errors.ipAddress}
            helperText={errors.ipAddress?.message || `Deja vacío o escribe "auto" para asignación automática`}
            placeholder="10.10.0.10  •  o escribe: auto"
            fullWidth
            margin="normal"
          />
        </Box>

        <Box className="pt-node-form__noteCard">
          <Typography className="pt-node-form__noteTitle">Pistas rápidas</Typography>
          <Typography className="pt-node-form__noteText">
            La private IP debe pertenecer a la subred padre. Si usas <b>auto</b>, el provider asignará una IP disponible.
          </Typography>
          <Typography className="pt-node-form__noteText">
            La IP pública no reemplaza la private IP: depende de la subred y de la política del deploy.
          </Typography>
          <Box sx={{ mt: 1.2 }}>
            <CidrLearningGuideButton buttonLabel="Ayuda con CIDR e IPs" />
          </Box>
        </Box>
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          "Runtime",
          "Imagen y tamaño",
          "Aquí decides con qué AMI se crea la instancia y qué tipo de máquina se reservará."
        )}

        <Box className="pt-node-form__grid pt-node-form__grid--two">
          <FormControl fullWidth margin="normal" error={!!errors.ami}>
            <InputLabel id="ami-label">AMI</InputLabel>
            <Select
              labelId="ami-label"
              {...register("ami")}
              label="AMI"
              defaultValue={nodeData.ami || ""}
              displayEmpty
            >
              <MenuItem value="">
                <em>Usar AMI por defecto</em>
              </MenuItem>
              {amiOptions.map((ami) => (
                <MenuItem key={ami.key} value={ami.value}>
                  {ami.region ? `${ami.label} (${ami.region})` : ami.label}
                </MenuItem>
              ))}
            </Select>
            {errors.ami && <FormHelperText>{errors.ami.message}</FormHelperText>}
            {!errors.ami && amiOptions.length === 0 && (
              <FormHelperText>
                No hay AMIs configuradas en el catalogo. Si lo dejas vacio, el backend usara la AMI por defecto.
              </FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth margin="normal" error={!!errors.instanceType}>
            <InputLabel id="instance-type-label">Instance Type</InputLabel>
            <Select
              labelId="instance-type-label"
              label="Instance Type"
              {...register("instanceType")}
              defaultValue={nodeData.instanceType || "t2.micro"}
            >
              {INSTANCE_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {errors.instanceType && (
              <FormHelperText>{errors.instanceType.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        {watch("instanceType")?.startsWith("t4g") && (
          <Alert severity="info" variant="outlined" sx={{ mt: 0.6 }}>
            Los tipos <b>t4g.*</b> usan arquitectura ARM (Graviton). Asegúrate de elegir una AMI compatible con ARM64.
          </Alert>
        )}
      </Box>

      <Box className="pt-node-form__section">
        {renderSectionHeader(
          "Acceso SSH",
          "Key pair y compatibilidad",
          "Aquí eliges la referencia al key pair que AWS buscará al lanzar la instancia."
        )}

        <Controller
          control={control}
          name="sshAccess"
          render={({ field }) => (
            <Autocomplete
              freeSolo
              options={keyPairOptions}
              value={
                keyPairOptions.find((option) => option.value === (field.value || "")) ||
                field.value ||
                null
              }
              onChange={(_event, newValue) => {
                if (typeof newValue === "string") {
                  field.onChange(newValue);
                  return;
                }
                field.onChange(newValue?.value || "");
              }}
              onInputChange={(_event, newInputValue, reason) => {
                if (reason === "input" || reason === "clear") {
                  field.onChange(newInputValue || "");
                }
              }}
              getOptionLabel={(option) => {
                if (typeof option === "string") return option;
                return option?.value || "";
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ py: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      {option.label}
                    </Typography>
                    {option.subtitle && (
                      <Typography variant="caption" color="text.secondary">
                        {option.subtitle}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="SSH Access (KeyPair)"
                  error={!!errors.sshAccess}
                  helperText={
                    errors.sshAccess?.message ||
                    (keyPairOptions.length > 0
                      ? "Elige una key pair registrada o escribe el nombre manualmente."
                      : "Opcional. Puedes escribir manualmente el nombre de una key pair existente en AWS.")
                  }
                  placeholder="p. ej., tesis-key"
                  fullWidth
                  margin="normal"
                />
              )}
            />
          )}
        />

        {keyPairOptions.length > 0 && (
          <Box className="pt-node-form__microCopy">
            <Typography className="pt-node-form__microCopyText">
              El catálogo reduce errores de tipeo y aún te deja escribir un nombre manual si no registraste esa key pair.
            </Typography>
          </Box>
        )}

        <Stack spacing={1.1} sx={{ mt: 0.8 }}>
          {hasScopeMismatch && (
            <Alert severity="warning" variant="outlined">
              La key pair seleccionada es de tipo <b>{selectedKeyPairScope}</b>, pero este laboratorio está resolviendo una
              conexión cloud de tipo <b>{executionScope}</b>. Puede que AWS no encuentre esa key pair en la cuenta efectiva del deploy.
            </Alert>
          )}
          {!hasScopeMismatch && hasConnectionMismatch && (
            <Alert severity="warning" variant="outlined">
              La key pair seleccionada está vinculada a otra conexión cloud. Verifica que exista también en la cuenta que
              este laboratorio usará realmente para desplegar.
            </Alert>
          )}

          <Box className="pt-node-form__noteCard pt-node-form__noteCard--soft">
            <Typography className="pt-node-form__noteTitle">Qué valida el sistema</Typography>
            <Typography className="pt-node-form__noteText">
              El <b>deploy</b> valida que esa key pair exista en la cuenta y región efectivas.
            </Typography>
            <Divider flexItem sx={{ my: 0.9 }} />
            <Typography className="pt-node-form__noteText">
              El acceso <b>SSH</b> posterior sigue dependiendo de que tengas el archivo <b>.pem</b> fuera de la plataforma, en el equipo desde el que te conectarás.
            </Typography>
          </Box>
        </Stack>
      </Box>


      <Box className="pt-node-form__actions">
        <Button type="submit" variant="contained" color="primary">
          Registrar Configuración
        </Button>
        <Button onClick={deleteNode} color="error">
          Delete Node
        </Button>
      </Box>

      <Snackbar
        open={mismatchSnackbarOpen}
        autoHideDuration={5000}
        onClose={() => setMismatchSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setMismatchSnackbarOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {mismatchSnackbarMessage}
        </Alert>
      </Snackbar>
    </form>
  );
};

export default InstanceNodeForm;
