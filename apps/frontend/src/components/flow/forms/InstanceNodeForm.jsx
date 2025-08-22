/* eslint-disable react/prop-types */
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { useFormValidationSchema } from './validations/useFormValidations';
import { TYPE_INSTANCE_NODE } from "../utils/constants";
import { useNetwork } from "../../../contexts/NetworkNodesContext";
import { useEffect } from "react";

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

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
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
        console.log("OnSubmit  instanceNode data:", data);
        onSave(data);
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
                helperText={errors.ipAddress?.message}
                placeholder="10.0.1.10"
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
                >
                    <MenuItem value="">Select AMI</MenuItem>
                    {amiList.map((a) => (
                        <MenuItem key={a.id} value={a.code || a.id}>
                            {a.name || a.id}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {errors.ami && <p>{errors.ami.message}</p>}

            <TextField
                label="Instance Type"
                {...register("instanceType")}
                error={!!errors.instanceType}
                helperText={errors.instanceType?.message}
                fullWidth
                margin="normal"
            />

            <TextField
                label="SSH Access (KeyPair)"
                {...register("sshAccess")}
                error={!!errors.sshAccess}
                helperText={errors.sshAccess?.message}
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
