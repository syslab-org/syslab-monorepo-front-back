// apps/frontend/src/components/flow/forms/InstanceNodeForm.jsx
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TYPE_INSTANCE_NODE } from "../utils/constants";
import { INSTANCE_TYPE_OPTIONS } from './options/instanceTypes';
import { useFormValidationSchema } from './validations/useFormValidations';

// Extract form logic and UI rendering from instance node form
const InstanceNodeForm = ({
  nodeData,
  onSave,
  deleteNode,
  parentSubnetCidr,            // <-- NUEVO (CIDR completo de la SUBNET)
  siblingIpsInSameSubnet = [], // <-- NUEVO
  amiList = []

}) => {

  const validationSchema = useFormValidationSchema(
    TYPE_INSTANCE_NODE,
    parentSubnetCidr,
    null,
    { existingIps: siblingIpsInSameSubnet },
    false
  );

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
    }
  })

  useEffect(() => {
    reset({
      name: nodeData.name || "",
      ipAddress: nodeData.ipAddress || "",
      ami: nodeData.ami || "",
      instanceType: nodeData.instanceType || "t2.micro",
      sshAccess: nodeData.sshAccess || "",
    });
  }, [nodeData, reset]);

  const onSubmit = (data) => {
    // normalizaciones
    const ipRaw = (data.ipAddress || '').trim();
    const amiRaw = (data.ami || '').trim();
    const sshRaw = (data.sshAccess || '').trim();

    const payload = {
      name: (data.name || '').trim(),
      instanceType: (data.instanceType || '').trim(),
      // si IP está vacía o 'auto' => undefined (AWS la asigna)
      ipAddress: !ipRaw || ipRaw.toLowerCase() === 'auto' ? undefined : ipRaw,
      // si AMI vacío => undefined (backend usa default)
      ami: amiRaw || undefined,
      // si SSH vacío => undefined (sin keypair)
      sshAccess: sshRaw || undefined,
    };

    console.log('OnSubmit instanceNode normalized payload:', payload);
    onSave(payload);
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
        helperText={
          errors.ipAddress?.message ||
          `Deja vacío o escribe "auto" para asignación automática`
        }
        placeholder="10.10.0.10  •  o escribe: auto"
        fullWidth
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
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
            <MenuItem key={a.id} value={a.code || a.id}>
              {a.name || a.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {errors.ami && <p>{errors.ami.message}</p>}



      <FormControl fullWidth margin="normal">
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
          <p style={{ color: 'red', marginTop: 4 }}>{errors.instanceType.message}</p>
        )}
      </FormControl>

      {/* 💡 OPCIONAL — Mensaje pedagógico si se elige tipo t4g.* */}
      {watch("instanceType")?.startsWith("t4g") && (
        <p style={{ fontSize: 13, marginTop: 6, color: '#666' }}>
          💡 Nota: Los tipos <b>t4g.*</b> usan procesadores ARM (Graviton).
          Asegúrate de seleccionar una AMI compatible con arquitectura <b>ARM64</b>.
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

      <Button type="submit" variant="contained" color="primary">
        Registrar Configuración
      </Button>
      <Button onClick={deleteNode} sx={{ ml: 1 }}>
        Delete Node
      </Button>

    </form>
  );
};

export default InstanceNodeForm;
