/* eslint-disable react/prop-types */
import { Box, Modal } from '@mui/material'

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


export const ModalLayout = ({ open, closeModal, form }) => {
   

    return (
        <Modal
            open={open}
            onClose={() => closeModal()}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
        >

            <Box
                sx={{ ...style, width: 400 }}
            >
               {form}
            </Box>

        </Modal>
    )
}
