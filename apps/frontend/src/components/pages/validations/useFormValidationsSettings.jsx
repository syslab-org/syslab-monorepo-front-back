import * as yup from 'yup';
import { TYPE_FORM_AMI } from '../../flow/utils/constants';

export const useFormValidationsSettings = (formType) => {


    switch (formType) {
        case TYPE_FORM_AMI:

            return yup.object({
                amiCode: yup.string()
                    .required("AMI code is required")
            }).required()

        default:
            return yup.object().shape({});
    }

}

