import * as yup from 'yup';
import { useTranslation } from 'react-i18next';

export const useRegistrationUserFormValidation = () => {
    const { t } = useTranslation()

    return yup.object({
        email: yup.string().email(t('auth.validation.invalidEmail')).required(t('auth.validation.emailRequired')),
        password: yup.string()
            .required(t('auth.validation.passwordRequired'))
            .min(8, t('auth.validation.passwordMin'))
            .matches(/[a-zA-Z]/, t('auth.validation.passwordLatin'))
    }).required()
}
