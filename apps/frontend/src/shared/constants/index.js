// src/shared/constants/index.js
export const DRAWERWITH = 240;

// Legacy alias kept while we finish removing old Firestore-oriented names.
export const FIRESTORE_COLLECTION = "vpcs";
export const NO_DOC_WARNING = "No document found for canvas id:";
export const LOADING_ERROR = "Error loading data from localStorage:";
export const SAVING_ERROR = "Error saving data to localStorage:";
export const FETCHING_ERROR = "Error fetching data from backend:";
export const UNKNOWN_EXPIRATION_FORMAT =
  "Formato de fecha de expiración desconocido:";
export const FLOW_EXPIRED = "Flow data has expired, clearing from localStorage";
export const FLOW_DATA_SAVED_FIREBASE = "Flow data successfully saved.";
export const ERROR_SAVING_FLOW_FIREBASE = "Error saving flow data: ";

//USERS ROL
export const USER_ROL_SUPER_ADMIN = "platform_admin";
export const USER_ROL_SUPER_ADMIN_LEGACY = "superadmin";
export const USER_ROL_TEACHER = "teacher";
export const USER_ROL_STUDENT = "student";

//Status
export const STATUS_USER_ACTIVE = "active";
export const STATUS_USER_DESACTIVE = "deactivated";
export const STATUS_USER_PENDING = "pending";

// Legacy collection names kept only for migration/interop paths.
export const DB_FIRESTORE_USERS = "users";
export const DB_FIRESTORE_VPCS = "vpcs";

export const USER_ROLES_ARRAY = [
  USER_ROL_SUPER_ADMIN,
  USER_ROL_TEACHER,
  USER_ROL_STUDENT,
];

export const USER_STATUS_ARRAY = [
  STATUS_USER_ACTIVE,
  STATUS_USER_DESACTIVE,
  STATUS_USER_PENDING,
];

// STATES RESPONSE TASKS
export const TASK_STATE_PENDING = "PENDING";
export const TASK_STATE_RUNNING = "RUNNING";
export const TASK_STATE_STARTED = "STARTED";
export const TASK_STATE_SUCCESS = "SUCCESS";
export const TASK_STATE_FAILURE = "FAILURE";
export const TASK_STATE_RETRY = "RETRY";
export const TASK_STATE_REVOKED = "REVOKED";

export const TASK_STATES_ARRAY = [
  TASK_STATE_PENDING,
  TASK_STATE_STARTED,
  TASK_STATE_SUCCESS,
  TASK_STATE_FAILURE,
  TASK_STATE_RETRY,
  TASK_STATE_REVOKED,
];

// CLOUD PROVIDERS
export const CLOUD_AWS_VALUE = "aws";
export const CLOUD_GCP_VALUE = "gcp";
export const CLOUD_AWS_LABEL = "AWS";
export const CLOUD_GCP_LABEL = "GCP";

// FORMS
export const TYPE_FORM_AMI = "amilistform";

// DATABASE COLLECTIONS (feature-shared)
export const DB_AMI_LIST = "amilist";
