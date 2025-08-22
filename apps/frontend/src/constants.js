export const DRAWERWITH = 240;
export const FIRESTORE_COLLECTION = "vpcs"
export const NO_DOC_WARNING = "No document found in Firebase for vpcid:";
export const LOADING_ERROR = "Error loading data from localStorage:";
export const SAVING_ERROR = "Error saving data to localStorage:";
export const FETCHING_ERROR = "Error fetching data from Firebase:";
export const UNKNOWN_EXPIRATION_FORMAT = "Formato de fecha de expiración desconocido:";
export const FLOW_EXPIRED = "Flow data has expired, clearing from localStorage";
export const FLOW_DATA_SAVED_FIREBASE = "Flow data successfully saved to Firebase!"
export const ERROR_SAVING_FLOW_FIREBASE = "Error saving flow data to Firebase: "

//USERS ROL
export const USER_ROL_SUPER_ADMIN = "superadmin"
export const USER_ROL_TEACHER = "teacher"
export const USER_ROL_STUDENT = "student"

//Status
export const STATUS_USER_ACTIVE = 'active'
export const STATUS_USER_DESACTIVE = 'deactivated'
export const STATUS_USER_PENDING = 'pending'

//DB
export const DB_FIRESTORE_USERS = "users"
export const DB_FIRESTORE_VPCS = "vpcs"

export const USER_ROLES_ARRAY = [
    USER_ROL_SUPER_ADMIN,
    USER_ROL_TEACHER,
    USER_ROL_STUDENT
]

export const USER_STATUS_ARRAY = [
    STATUS_USER_ACTIVE,
    STATUS_USER_DESACTIVE,
    STATUS_USER_PENDING
]

