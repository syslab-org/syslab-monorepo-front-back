# Infraestructura AWS auxiliar

Esta guia refleja solo lo que hoy sigue definido en `infra/terraform/` y en el `Makefile`. Ya no documenta un despliegue administrado de servicios de aplicacion en AWS.

## 1. Requisitos previos

- `aws` CLI v2
- `terraform >= 1.6`
- `docker`
- `make`

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

## 5. Inicializar Terraform principal

```bash
terraform -chdir=infra/terraform init -reconfigure
```

## 6. Recursos que siguen definidos

La capa auxiliar actual mantiene:

- VPC y subnets
- grupos de seguridad
- RDS PostgreSQL
- ElastiCache Redis
- ECR para imagenes Docker
- S3 para planes
- Secrets Manager para `DATABASE_URL`
- IAM/OIDC para automatizaciones

## 7. Operacion disponible hoy

Ver outputs:

```bash
make tf-outputs AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Ver recursos en state:

```bash
make aws-status AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Destruir la infraestructura auxiliar:

```bash
make aws-down AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Crear o actualizar la base de datos administrada:

```bash
make aws-db-up AWS_PROFILE=tesis AWS_REGION=us-east-1
```

## 8. Costos y seguridad

- `aws-down` destruye el stack principal de `infra/terraform`, pero el backend remoto en S3 y DynamoDB sigue existiendo.
- `RDS` y `Redis` generan costo mientras estan activos.
- define `allowed_hosts`, `cors_allowed_origins` y `csrf_trusted_origins` explicitos antes de usar un entorno serio.
- no guardes llaves AWS en archivos versionados.
