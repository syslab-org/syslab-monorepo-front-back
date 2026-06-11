import * as yup from 'yup'
import { useTranslation } from 'react-i18next'

export const useInviteUserFormValidation = () => {
    const { t } = useTranslation()

    return yup.object({
        email: yup.string().email(t('auth.validation.invalidEmail')).required(t('auth.validation.emailRequired')),
        first_name: yup.string().max(150, t('inviteUser.firstNameTooLong')),
        last_name: yup.string().max(150, t('inviteUser.lastNameTooLong')),
        role: yup.string().required(t('inviteUser.roleRequired')),
        status: yup.string().required(t('inviteUser.statusRequired')),
        course_id: yup.string().nullable(),
    }).required()
}
