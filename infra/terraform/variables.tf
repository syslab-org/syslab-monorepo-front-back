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
  default = "tesis"
}

#########################
# Backend (Django)
#########################

variable "backend_cpu" {
  type        = number
  default     = 256
  description = "CPU units para backend (Fargate)"
}

variable "backend_memory" {
  type        = number
  default     = 512
  description = "Memoria MiB para backend (Fargate)"
}

variable "backend_container_port" {
  type        = number
  default     = 8000
  description = "Puerto expuesto por Django"
}

variable "backend_healthcheck_path" {
  type        = string
  default     = "/healthz"
  description = "Path de healthcheck para el backend"
}

#########################
# Celery
#########################

variable "celery_cpu" {
  type        = number
  default     = 256
  description = "CPU units para Celery (Fargate)"
}

variable "celery_memory" {
  type        = number
  default     = 512
  description = "Memoria MiB para Celery (Fargate)"
}

variable "celery_broker_url" {
  type        = string
  default     = ""
  description = "URL de Redis para Celery (ej: redis://...)"
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
  default     = ["*"] # en prod: ["api.mi-dominio.com"]
  description = "Lista de hosts permitidos por Django (ALLOWED_HOSTS)"
}

variable "cors_allowed_origins" {
  type        = list(string)
  default     = ["http://localhost:5173"]
  description = "Orígenes permitidos para CORS"
}

variable "csrf_trusted_origins" {
  type        = list(string)
  default     = []
  description = "Orígenes confiables para CSRF (https://... del ALB o dominio)"
}
variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ARN del certificado ACM para el ALB (HTTPS)"
}

variable "backend_desired_count" {
  type        = number
  default     = 1
  description = "Número de tasks del servicio backend"
}

variable "celery_desired_count" {
  type        = number
  default     = 1
  description = "Número de tasks del servicio celery"
}

variable "database_url" {
  type        = string
  default     = ""
  description = "DATABASE_URL estilo postgres://user:pass@host:5432/dbname (vacío = SQLite)"
}

variable "db_ssl_require" {
  type        = bool
  default     = true
  description = "Forzar SSL en Postgres en ECS (usado por dj_database_url)"
}

# (opcional) Bucket S3 para guardar/leer planes
variable "s3_plans_bucket" {
  type        = string
  default     = ""
  description = "Nombre del bucket S3 para almacenar planes (vacío = no usar S3)"
}

variable "enable_terraform_apply_in_ecs" {
  type        = bool
  default     = true # en dev: true; en prod podrías poner false
  description = "Si true, adjunta permisos EC2 (VPC/Subnets/Routes/IGW) al task role para que Terraform aplique cambios desde ECS."
}

# ============================================
# DB vía AWS Secrets Manager (opcional)
# ============================================
variable "database_url_secret_arn" {
  type        = string
  default     = ""
  description = "ARN del Secret en AWS Secrets Manager que contiene DATABASE_URL (si se define, ECS lo inyecta como secret)."
}

# ============================================
# S3 (ya la tienes, solo la dejo aquí para referencia)
# ============================================
# variable "s3_plans_bucket" {
#   type        = string
#   default     = ""
#   description = "Nombre del bucket S3 para almacenar planes (vacío = no usar S3)."
# }

# ============================================
# (Opcional) Toggle para permisos de Terraform Apply desde ECS
# ============================================
# Ya tienes esta variable. Se usa para condicionar políticas IAM que permiten
# a la task crear/gestionar VPC, subnets, etc. desde el contenedor.
# Asegúrate de que tu iam_task_role.tf utilice este flag.
# variable "enable_terraform_apply_in_ecs" {
#   type        = bool
#   default     = true
#   description = "Si true, adjunta permisos EC2/VPC al task role para que Terraform aplique cambios desde ECS."
# }
