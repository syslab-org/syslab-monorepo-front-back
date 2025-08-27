# 📒 Bitácora de Infraestructura y Deploy - Proyecto Tesis

Este documento registra en detalle lo que se ha realizado para preparar el proyecto **tesis** para poder trabajar con **Docker + AWS + Terraform**, y por qué es necesario cada paso.
Sirve como guía de referencia para el equipo y como documentación en el repositorio.

---

## 1. Organización del Repositorio

Se creó un **monorepo** llamado `tesis-monorepo` con la siguiente estructura:

- `apps/frontend/`: aplicación React (Vite + Zustand + Firebase).
- `apps/backend/`: backend en Django + Celery.
- `tools/docker/`: Dockerfiles y configuraciones.
- `infra/`: infraestructura como código con Terraform.
  - `bootstrap/`: configuración inicial de recursos base para Terraform.
  - `terraform/`: módulos y recursos principales (ECR, ECS, etc).

👉 **¿Por qué monorepo?**
Unifica el código frontend y backend junto con la infraestructura en un solo lugar.
Ventajas: coordinación más simple, versionado único, CI/CD más sencillo.

---

## 2. Bootstrap de Terraform

Antes de usar Terraform, necesitamos un lugar donde guardar su **estado remoto** (state).
Terraform guarda información sobre los recursos creados, y se requiere un almacenamiento **seguro y compartido**.

Se creó en AWS:

- **S3 Bucket** (`tesis-dev-tfstate`):

  - Almacena el archivo de estado de Terraform.
  - Versionado activado → histórico de cambios.
  - Encriptado automáticamente.

- **DynamoDB Table** (`tesis-dev-tf-locks`):
  - Maneja **locks** para evitar que dos personas/automatizaciones apliquen Terraform al mismo tiempo.

👉 **¿Por qué?**
Garantiza consistencia del estado y seguridad del despliegue en equipo.

---

## 3. Componentes Clave en AWS

### 🪣 S3 Bucket

Servicio de almacenamiento de objetos.
Aquí lo usamos para guardar el estado de Terraform, pero también puede almacenar archivos, backups o artefactos de despliegue.

### 🍃 DynamoDB

Base de datos NoSQL de baja latencia.
En nuestro caso: usada para manejar **locks** de Terraform y evitar carreras en los despliegues.

### 📦 Amazon ECR (Elastic Container Registry)

Registro privado de imágenes Docker en AWS.
Aquí subimos las imágenes de **backend** y **celery** para luego usarlas en ECS/Fargate u otros entornos.

### 🐇 Redis

Base de datos en memoria.
En nuestro stack: usado como **broker y backend de resultados** de Celery (cola de tareas asíncronas).

### 🕑 Celery

Framework para ejecución asíncrona y programación de tareas.
Permite que el backend procese trabajos en segundo plano (ej: despliegues, validaciones, procesos largos).

### 🌼 Flower

UI de monitoreo para Celery.
Sirve para inspeccionar workers, tareas en ejecución, errores y métricas.

---

## 4. Infraestructura con Terraform

En `infra/terraform` definimos:

- **Repositorios ECR**:
  - `tesis-dev-backend`
  - `tesis-dev-celery`

👉 Estos repos son necesarios para subir las imágenes Docker construidas localmente, que luego se usarán en AWS ECS.

**Flujo:**

1. Terraform crea los repos en ECR.
2. Hacemos `docker login` a ECR.
3. Taggeamos las imágenes locales.
4. Hacemos `docker push` para subirlas.

---

## 5. Contenedores con Docker Compose

Se configuró `tools/docker/compose.dev.yml` con servicios:

- `frontend` → React (puerto `5173`).
- `backend` → Django (puerto `8000`).
- `celery` → worker Celery.
- `flower` → UI de Celery (puerto `5555`).
- `redis` → broker.

👉 **¿Por qué Compose?**
Permite levantar todo el stack de desarrollo en local con un solo comando (`make up`).

Además se añadieron **healthchecks** (para backend y redis) para garantizar que los contenedores dependientes esperen hasta que los servicios estén listos.

---

## 6. Makefile

Se creó un `Makefile` para simplificar comandos:

- `make up` → levanta todo el stack local.
- `make down` → baja todo.
- `make logs` → logs en vivo.
- `make restart` → reinicia.
- `make sh-backend`, `make sh-frontend`, etc → entrar a un contenedor.
- `make lint` / `make test` → calidad de código y tests.
- **Nuevo:** `make push` → loguea en ECR, taggea y pushea imágenes backend/celery.

---

## 7. Flujo de Trabajo Actual

1. **Desarrollar en local** con `make up`.
2. **Construir imágenes** de backend/celery (ya lo hace `make up`).
3. **Subir imágenes a ECR** con `make push`.
   - Usa AWS CLI + Docker.
   - Pushea imágenes `tesis-container-backend:latest` → `tesis-dev-backend` en ECR.
   - Pushea imágenes `tesis-container-celery:latest` → `tesis-dev-celery` en ECR.

---

## 8. ¿Qué sigue?

Una vez que tengamos las imágenes en ECR:

- Definir en Terraform los **ECS Task Definitions** que usen esas imágenes.
- Crear un **ECS Cluster** (con Fargate).
- Configurar servicios (backend + celery workers).
- Conectar todo a una **VPC**, **subnets**, y **load balancer**.

Así tendremos un **deploy directo en AWS ECS**.

---

## 9. Beneficios de la Arquitectura

- **Reproducibilidad**: todo está en Docker y Terraform.
- **Escalabilidad**: ECS puede escalar workers Celery según la carga.
- **Seguridad**: S3 y DynamoDB aseguran estado de Terraform, ECR guarda imágenes privadas.
- **Simplicidad**: un solo Makefile orquesta desarrollo y deploy.

---

# ✅ Resumen

- S3 → guarda estado Terraform.
- DynamoDB → maneja locks.
- ECR → repos privados de imágenes Docker.
- Docker Compose → stack local completo.
- Celery + Redis + Flower → sistema de colas y monitoreo.
- Terraform → infra como código, consistente y versionada.
- Makefile → automatiza comandos, incluido el push a ECR.
