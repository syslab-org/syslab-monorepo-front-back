// apps/frontend/src/components/flow/forms/InstanceNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
    <form onSubmit={handleSubmit(onSubmit)}>
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
          {amiList.map((a) => (
            <MenuItem key={a.id || a.code} value={a.data.amiCode}>
              {a.data.amiCode || a.id}
            </MenuItem>
          ))}
        </Select>
        {errors.ami && <FormHelperText>{errors.ami.message}</FormHelperText>}
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
        <p style={{ fontSize: 13, marginTop: 6, color: '#666' }}>
          💡 Los tipos <b>t4g.*</b> usan ARM (Graviton). Asegúrate de elegir una AMI <b>ARM64</b>.
        </p>
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


      <div style={{ marginTop: 12 }}>
        <Button type="submit" variant="contained" color="primary">
          Registrar Configuración
        </Button>
        <Button onClick={deleteNode} sx={{ ml: 1 }}>
          Delete Node
        </Button>
      </div>
    </form>
  );
};

export default InstanceNodeForm;
