/* eslint-disable react/prop-types */
import { Box, Button, Modal, TextField } from '@mui/material'
import { useFormValidationsSettings } from '../validations/useFormValidationsSettings';
import { TYPE_FORM_AMI } from '../../flow/utils/constants';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

const AddAmiModal = ({ open, closeModal }) => {

    const validationSchema = useFormValidationsSettings(TYPE_FORM_AMI)

    const {register,handleSubmit,formState:{errors}} = useForm({
        resolver:yupResolver(validationSchema),
        defaultValues:{
            amiCode:''
        }
    })

    const onSubmit = (data)=>{
        // console.log('onSubmit AddAmiMOdal: ',data);
        closeModal(data)
    }

    return (
        <Modal
            open={open}
            onClose={() => closeModal()}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
        >

            <Box sx={{ ...style, width: 400 }}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                       <TextField
                       label="AMI Code"
                        {...register("amiCode")}
                        error={!!errors.amiCode}
                        helperText={errors.amiCode?.message}
                        fullWidth
                        margin='normal'
                       />

                       <Button type='submit' variant='contained' color='primary'>
                            Add AMI
                       </Button>
                    </form>
            </Box>

        </Modal>
    )
}

export default AddAmiModal