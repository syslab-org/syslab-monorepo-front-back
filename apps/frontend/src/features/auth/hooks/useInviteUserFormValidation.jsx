import * as yup from 'yup'

export const useInviteUserFormValidation = () => {
    return yup.object({
        email: yup.string().email('Formato de correo invalido').required('El correo es obligatorio'),
        first_name: yup.string().max(150, 'El nombre es demasiado largo'),
        last_name: yup.string().max(150, 'El apellido es demasiado largo'),
        role: yup.string().required('El rol es obligatorio'),
        status: yup.string().required('El estado es obligatorio'),
        course_id: yup.string().nullable(),
    }).required()
}
