import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { useFormValidationSchema } from './validations/useFormValidations'
import { CLOUD_AWS_LABEL, CLOUD_AWS_VALUE, VPC_FORM } from '../utils/constants'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// eslint-disable-next-line react/prop-types
const NewVPCForm = ({ onSave }) => {
    const validationSchema = useFormValidationSchema(VPC_FORM, true); // el true activa validación CIDR

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            cloudProvider: 'AWS',
            vpcName: '',
            cidrBlock: ''
        }
    })

    const onSubmit = (data) => {
        const [base, prefix] = data.cidrBlock.split('/');
        onSave({ ...data, cidrBlock: base, prefixLength: prefix });
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl fullWidth>
                <InputLabel id="select-cloud-label">Cloud Providerrrr</InputLabel>
                <Select
                    labelId="select-cloud-label"
                    id="select-cloud"
                    {...register("cloudProvider")}
                    label=" Cloud Provider"
                    defaultValue={CLOUD_AWS_VALUE}
                >
                    <MenuItem value={CLOUD_AWS_VALUE}>{CLOUD_AWS_LABEL}</MenuItem>
                </Select>
                {errors.cloudProvider && <p>{errors.cloudProvider.message}</p>}
            </FormControl>

            <TextField
                label="Nombre de la VPC"
                {...register("vpcName")}
                error={!!errors.vpcName}
                helperText={errors.vpcName?.message}
                fullWidth
                margin="normal"
            />

            <TextField
                label="CIDR Block (ej: 192.168.0.0/24)"
                {...register("cidrBlock")}
                error={!!errors.cidrBlock}
                helperText={errors.cidrBlock?.message}
                placeholder="Set full CIDR block"
                fullWidth
            />

            <Button type="submit" variant="contained" color="primary">
                Crear VPC
            </Button>
        </form>
    )
}

export default NewVPCForm;
