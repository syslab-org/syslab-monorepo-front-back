# Infraestructura con Terraform – Proyecto Tesis

Este documento explica **cómo usar la carpeta `infra/terraform/`**, qué recursos se crean y **por qué existen**. Está pensado como guía práctica y como referencia conceptual.

---

## 1. Servicios base que usamos

### 🗄️ S3 Bucket

- **Qué es**: Amazon S3 (Simple Storage Service) es almacenamiento de objetos (archivos, estados, backups).
- **Por qué lo usamos**:
  - Guardar el archivo de estado de Terraform (`terraform.tfstate`).
  - Con **versioning + cifrado + acceso bloqueado** → aseguramos que no se pierda ni corrompa.
- **En este proyecto**: bucket `tesis-dev-tfstate`.

---

### 📋 DynamoDB

- **Qué es**: base de datos NoSQL de clave–valor altamente escalable.
- **Por qué lo usamos**:
  - Terraform necesita **locking** para que no se corrompa el estado si dos personas hacen `apply` al mismo tiempo.
  - DynamoDB guarda un **candado** en la fila `LockID`.
- **En este proyecto**: tabla `tesis-dev-tf-locks`.

---

### 📦 ECR (Elastic Container Registry)

- **Qué es**: repositorio privado de imágenes Docker en AWS.
- **Por qué lo usamos**:
  - Guardar nuestras imágenes de `backend` y `celery`.
- **En este proyecto**:
  - `tesis-dev-backend`
  - `tesis-dev-celery`

---

## 2. Estructura de archivos

En `infra/terraform/` encontrarás:

- **`versions.tf`** → fija versiones de Terraform y providers (`aws`, `random`).
- **`variables.tf`** → variables comunes: `project`, `env`, `region`, `aws_profile`.
- **`providers.tf`** → declara el provider AWS, usando el perfil que configuraste (`tesis`).
- **`backend.tf`** → conecta Terraform al S3 y DynamoDB creados en el bootstrap.
- **`ecr.tf`** → define los repositorios ECR de backend y celery.
- **`outputs.tf`** → expone las URLs de los repos ECR como outputs.

---

## 3. Flujo de uso

### Paso 1. Inicializar

Reconfigura el backend S3/DynamoDB:

```bash
cd infra/terraform
terraform init -reconfigure
```
