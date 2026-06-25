# Plataforma en AWS

Esta guia despliega la plataforma del proyecto en AWS. No levanta una sola VM: crea el entorno base de backend, celery y sus dependencias administradas.

## 1. Requisitos previos

- `aws` CLI v2
- `terraform >= 1.6`
- `docker`
- `make`
- `jq`
- `curl`
- `session-manager-plugin`

## 2. Configurar credenciales AWS

En la maquina desde donde correrás Terraform:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
export AWS_PROFILE=tesis
export AWS_REGION=us-east-1
```

## 3. Bootstrap del backend remoto de Terraform

Primero crea S3 y DynamoDB para el state remoto:

```bash
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
cd infra/bootstrap
terraform init
terraform apply
cd ../..
```

Con los valores por defecto del ejemplo, esto crea:

- bucket `tesis-dev-tfstate`
- tabla `tesis-dev-tf-locks`

## 4. Preparar variables del stack AWS

```bash
cp infra/terraform/dev.auto.tfvars.example infra/terraform/dev.auto.tfvars
```

Minimo recomendado en `infra/terraform/dev.auto.tfvars`:

- `aws_profile`
- `region`
- `secret_key`
- `django_debug=false`
- `allowed_hosts`
- `cors_allowed_origins`
- `csrf_trusted_origins`

Si usarás HTTPS en el ALB, agrega `acm_certificate_arn`.

## 5. Inicializar Terraform principal

```bash
terraform -chdir=infra/terraform init -reconfigure
```

## 6. Construir imagenes Docker

```bash
make build
```

## 7. Desplegar todo en AWS

```bash
make aws-bootstrap AWS_PROFILE=tesis AWS_REGION=us-east-1 TAG=dev-latest
```

Ese flujo:

1. crea la infra base del stack principal con `backend=0` y `celery=0`
2. construye y publica imagenes en ECR
3. aplica Terraform con replicas activas
4. espera a que ECS quede estable
5. ejecuta migraciones Django dentro del servicio ECS
6. espera `healthz` del ALB

## 8. Verificar el despliegue

```bash
make tf-outputs AWS_PROFILE=tesis AWS_REGION=us-east-1
make echo-backend-url AWS_PROFILE=tesis AWS_REGION=us-east-1
PLAN_FILE=case-01-single-vpc.json make smoke AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Checks utiles:

- `backend_url`
- `alb_dns_name`
- `plans_bucket`
- `redis_endpoint`
- `rds_endpoint`

## 9. Operacion normal

Levantar o reanudar servicios:

```bash
make aws-up-safe AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Redeploy despues de cambios en backend o celery:

```bash
make build
make aws-redeploy-safe AWS_PROFILE=tesis AWS_REGION=us-east-1 TAG=dev-latest
```

Apagar tareas sin destruir infraestructura:

```bash
make aws-stop AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Destruir la infraestructura del stack principal:

```bash
make aws-down AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Ver estado:

```bash
make aws-status AWS_PROFILE=tesis AWS_REGION=us-east-1
```

## 10. Costos y seguridad

- `aws-down` destruye el stack principal, pero el backend remoto de Terraform en S3 y DynamoDB sigue existiendo
- `RDS`, `ALB`, `Redis` y tareas ECS generan costo mientras estan activos
- usa `make aws-stop` cuando quieras bajar costo sin destruir todo
- define `allowed_hosts`, `cors_allowed_origins` y `csrf_trusted_origins` explicitos antes de usar un entorno serio
- no guardes llaves AWS en archivos versionados
