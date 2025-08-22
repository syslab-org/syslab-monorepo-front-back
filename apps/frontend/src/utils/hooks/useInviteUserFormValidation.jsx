import * as yup from 'yup';

export const useInviteUserFormValidation = () => {

    return yup.object({
        email: yup.string().email('Invalid email format').required('Email is required'),
        role: yup.string().required("Role is required"),
        status: yup.string().required("Status is required")
    }).required()
}

