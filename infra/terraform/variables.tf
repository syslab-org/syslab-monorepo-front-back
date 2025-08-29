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


