// apps/frontend/src/components/flow/forms/InstanceNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
  defaultAssociatePublicIp = true,
}) => {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pt-node-form">
      <Box className="pt-node-form__header">
        <Typography className="pt-node-form__eyebrow">workload node</Typography>
        <Typography className="pt-node-form__title">Instance</Typography>
        <Typography className="pt-node-form__subtitle">
          Configure naming, addressing and runtime profile for this VM.
        </Typography>
      </Box>

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

      <Alert severity="info" variant="outlined" sx={{ mt: 0.2, mb: 0.8 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Qué significa este workload
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.4 }}>
          - La private IP debe pertenecer a la subred padre.
        </Typography>
        <Typography variant="caption" display="block">
          - Si la dejas vacía o escribes `auto`, el provider asignará una IP disponible automáticamente.
        </Typography>
        <Typography variant="caption" display="block">
          - La IP pública depende del tipo de subred y de la política de despliegue, no reemplaza la private IP interna.
        </Typography>
        <Typography variant="caption" display="block">
          - La SSH key define con qué par de llaves podrás entrar si habilitas acceso remoto.
        </Typography>
        <Box sx={{ mt: 1.25 }}>
          <CidrLearningGuideButton buttonLabel="Ayuda con CIDR e IPs" />
        </Box>
      </Alert>

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

      {/* Mensaje didáctico si se elige t4g.* */}
      {watch("instanceType")?.startsWith("t4g") && (
        <Alert severity="info" variant="outlined" sx={{ mt: 0.4 }}>
          Los tipos t4g.* usan ARM (Graviton). Selecciona una AMI ARM64.
        </Alert>
      )}

      <TextField
        label="SSH Access (KeyPair)"
        {...register("sshAccess")}
        error={!!errors.sshAccess}
        helperText={errors.sshAccess?.message || "Opcional. Déjalo vacío si no necesitas SSH"}
        placeholder="p. ej., tesis-key  (opcional)"
        fullWidth
        margin="normal"
      />


      <Box className="pt-node-form__actions">
        <Button type="submit" variant="contained" color="primary">
          Registrar Configuración
        </Button>
        <Button onClick={deleteNode} color="error">
          Delete Node
        </Button>
      </Box>
    </form>
  );
};

export default InstanceNodeForm;
