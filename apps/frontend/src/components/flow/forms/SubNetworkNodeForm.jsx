/* eslint-disable react/prop-types */
import { yupResolver } from '@hookform/resolvers/yup';
import {
    Button,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";
import { useEffect } from 'react';
import { Controller, useForm } from "react-hook-form";
import { TYPE_SUBNETWORK_NODE } from "../utils/constants";
import { useFormValidationSchema } from './validations/useFormValidations';

const ROUTE_TABLE_OPTIONS = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
];

const SUBNET_TYPE_OPTIONS = [
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
];


const SubNetworkNodeForm = ({
    nodeData = {},
    onSave,
    deleteNode,
    parentVpcCidr,                    // CIDR completo de la VPC padre (p.ej. 10.0.0.0/20)
    siblingSubnetCidrsInSameVpc = [], // CIDRs hermanas para evitar solape
}) => {
    // Descomponer CIDR de la VPC para el schema
    const [vpcBase, vpcPrefixStr] = (parentVpcCidr || "").split("/");
    const vpcPrefix = vpcPrefixStr ? Number(vpcPrefixStr) : null;

    const validationSchema = useFormValidationSchema(
        TYPE_SUBNETWORK_NODE,
        vpcBase,
        vpcPrefix,
        { existingCidrs: siblingSubnetCidrsInSameVpc },
        true
    );

    // Normalizar route_table entrante
    const incomingRouteType = typeof nodeData.route_table === "string"
        ? nodeData.route_table.toLowerCase()
        : "private";

    const incomingSubnetType = typeof nodeData.subnetType === "string"
        ? nodeData.subnetType.toLowerCase()
        : "private";


    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            subnetName: nodeData.subnetName || "",
            cidrBlock: nodeData.cidrBlock || "",
            availabilityZone: nodeData.availabilityZone || "", // mantiene tu naming actual
            route_table: incomingRouteType,                // <-- siempre minúsculas
            subnetType: incomingSubnetType,
        },
    });

    useEffect(() => {
        // Cuando cambia el nodo seleccionado, resetea el form con valores normalizados
        reset({
            subnetName: nodeData.subnetName || "",
            cidrBlock: nodeData.cidrBlock || "",
            availabilityZone: nodeData.availabilityZone || "",
            route_table: (typeof nodeData.route_table === "string"
                ? nodeData.route_table.toLowerCase()
                : "private"),
            subnetType: (typeof nodeData.subnetType === "string"
                ? nodeData.subnetType.toLowerCase()
                : "private"),
        });
    }, [nodeData, reset]);

    const onSubmit = (data) => {
        // Defensa extra: normaliza antes de guardar
        const route_table = String(data.route_table || "private").toLowerCase();
        const subnetType = String(data.subnetType || "private").toLowerCase();

        onSave({
            ...data,
            route_table,
            subnetType,
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
                label="Subnet Name"
                {...register("subnetName")}
                error={!!errors.subnetName}
                helperText={errors.subnetName?.message}
                fullWidth
                margin="normal"
            />

            <TextField
                label={`Subnet's CIDR Block (inside ${parentVpcCidr || 'VPC'})`}
                {...register("cidrBlock")}
                error={!!errors.cidrBlock}
                helperText={errors.cidrBlock?.message}
                placeholder="10.0.1.0/26"
                fullWidth
                margin="normal"
            />

            <TextField
                label="Availability Zone"
                {...register("availabilityZone")}
                error={!!errors.availabilityZone}
                helperText={errors.availabilityZone?.message}
                fullWidth
                margin="normal"
            />

            <FormControl fullWidth margin="normal" error={!!errors.route_table}>
                <InputLabel id="rt-label">Route Table Type</InputLabel>
                <Controller
                    name="route_table"
                    control={control}
                    render={({ field }) => (
                        <Select
                            labelId="rt-label"
                            label="Route Table Type"
                            {...field}
                            value={field.value || "private"}
                        >
                            {ROUTE_TABLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    )}
                />
                {errors.route_table && (
                    <FormHelperText>{errors.route_table.message}</FormHelperText>
                )}
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!errors.subnetType}>
                <InputLabel id="subnet-type-label">Subnet Type</InputLabel>
                <Controller
                    name="subnetType"
                    control={control}
                    render={({ field }) => (
                        <Select
                            labelId="subnet-type-label"
                            label="Subnet Type"
                            {...field}
                            value={field.value || "private"}
                        >
                            {SUBNET_TYPE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    )}
                />
                {errors.subnetType && (
                    <FormHelperText>{errors.subnetType.message}</FormHelperText>
                )}
            </FormControl>


            <Button type="submit" variant="contained" color="primary">
                Registrar Configuración
            </Button>
            <Button onClick={deleteNode} sx={{ ml: 1 }}>
                Delete Node
            </Button>
        </form>
    );
};

export default SubNetworkNodeForm;
