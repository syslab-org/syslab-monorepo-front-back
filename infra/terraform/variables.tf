# /infra/terraform/variables.tf
#########################
# Global settings
#########################

variable "project" {
  type    = string
  default = "tesis"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = ""
}

variable "secret_key" {
  description = "Django SECRET_KEY"
  type        = string
  default     = "dev-insecure-secret-key-change-me"
}


# ------- Django / CORS -------
variable "django_debug" {
  type        = bool
  default     = true # en prod cámbialo a false desde tfvars/vars de pipeline
  description = "Equivalente a DEBUG en Django"
}

variable "allowed_hosts" {
  type        = list(string)
  default     = ["*"]
  description = "Lista de hosts permitidos por Django (ALLOWED_HOSTS)"
}

variable "cors_allowed_origins" {
  type        = list(string)
  default     = ["http://localhost:5173"]
  description = "Orígenes permitidos para CORS"
}

variable "csrf_trusted_origins" {
  type        = list(string)
  default     = ["http://localhost:5173"]
  description = "Orígenes confiables para CSRF"
}

variable "database_url" {
  type        = string
  default     = ""
  description = "DATABASE_URL estilo postgres://user:pass@host:5432/dbname (vacío = SQLite)"
}

# (opcional) Bucket S3 para guardar/leer planes
variable "s3_plans_bucket" {
  type        = string
  default     = ""
  description = "Nombre del bucket S3 para almacenar planes (vacío = no usar S3)"
}

# ============================================
# DB vía AWS Secrets Manager (opcional)
# ============================================
variable "database_url_secret_arn" {
  type        = string
  default     = ""
  description = "ARN del Secret en AWS Secrets Manager que contiene DATABASE_URL."
}
