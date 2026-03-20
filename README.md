# 📒 Bitácora de Infraestructura y Deploy - Proyecto Tesis

Este documento registra en detalle lo que se ha realizado para preparar el proyecto **tesis** para poder trabajar con **Docker + AWS + Terraform**, y por qué es necesario cada paso.
Sirve como guía de referencia para el equipo y como documentación en el repositorio.

---

## 1. Organización del Repositorio

Se creó un **monorepo** llamado `tesis-monorepo` con la siguiente estructura:

- `apps/frontend/`: aplicación React (Vite + Zustand) que consume el backend como fuente de verdad para auth, laboratorios y ejecuciones.
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
- **Infra AWS:** `make aws-start`, `make aws-stop`, `make aws-down`, `make aws-status`.
- **Debug:** `make echo-backend-url`, `make tf-outputs`.

---

## 7. Flujo de Trabajo Actual

1. **Desarrollar en local** con `make up`.
2. **Construir imágenes** de backend/celery (ya lo hace `make up`).
3. **Subir imágenes a ECR** con `make push`.
   - Usa AWS CLI + Docker.
   - Pushea imágenes `tesis-container-backend:latest` → `tesis-dev-backend` en ECR.
   - Pushea imágenes `tesis-container-celery:latest` → `tesis-dev-celery` en ECR.

---

## 8. Deploy en AWS ECS

Terraform define:

- **ECS Cluster** (`tesis-dev-cluster`).
- **ECS Task Definitions** para backend y celery.
- **ECS Services** (backend detrás de ALB, celery sin ALB).
- **Load Balancer (ALB)** con healthchecks.
- **Redis (ElastiCache)** como broker/result backend.

### 🔄 Flujo de Deploy

1. **Construir imágenes locales**:
   ```bash
   make build
   ```
2. **Construir imágenes locales**:
   ```bash
   make push
   ```
3. **Aplicar Terraform para desplegar ECS**:
   ```bash
   make aws-start
   ```
4. **Verificar healthcheck**:
   ```bash
   make echo-backend-url
   curl -s "$BACKEND_URL/healthz/"
   ```
5. **Probar Celery**:
   ```bash
   make test-celery N=7
   ```

---

## 9. Administración de Infra

- **Levantar backend (sin Celery)**
  ```bash
  make aws-start
  ```
- **Apagar backend/celery (manteniendo S3+DynamoDB):**
  ```bash
  make aws-stop
  ```
- **Apagar todo lo que cuesta 💸 (ECS, ALB, Redis, etc.)**
  ```bash
  make aws-down
  ```
- **Ver estado actual**
  ```bash
  make aws-status
  ```

## 10) Encaje de piezas (por qué esta arquitectura)

- **Docker** normaliza el runtime entre dev y prod.
- **ECR** guarda las imágenes que ECS ejecutará.
- **ECS/Fargate** corre contenedores sin administrar servidores.
- **ALB** expone el backend con healthchecks y failover.
- **Redis (ElastiCache)**: cola y resultados para Celery (persistencia en RAM administrada).
- **CloudWatch Logs**: logs centralizados sin instalar nada.
- **Terraform**: infra reproducible, declarativa y versionada.

---

## 11) Costos y cómo apagar para no pagar

- **ECS/Fargate + ALB + ElastiCache** generan costo mientras están activos.
- Para ahorrar:
  - **Poner desired_count=0** (apaga tareas, deja ALB/Redis vivos):
    ```bash
    make aws-stop
    ```
  - **Destruir todo lo “caro”** (ECS, ALB, Redis, etc. — mantiene S3+DynamoDB del state):
    ```bash
    make aws-down
    ```
- **S3 + DynamoDB** del state cuestan muy poco; conviene **mantenerlos**.

---

## 12) Tips de operación

- Cambias código backend/celery → **reconstruye y sube**:

  ```bash
  make push
  make aws-start
  ```

- Escalar Celery (ejemplo a 3 réplicas)\*\*:
  ```bash
  cd infra/terraform
  terraform apply -var="celery_desired_count=3"
  ```
- Logs:
  Backend → CloudWatch /ecs/tesis/dev/backend
  Celery → CloudWatch /ecs/tesis/dev/celery

# Despliegue en AWS con Terraform, ECS y ALB

Este proyecto utiliza **Terraform** para provisionar la infraestructura en AWS y **Docker/ECS** para desplegar los servicios del backend y Celery. A continuación se detalla el flujo de despliegue y validación.

## Flujo de Despliegue

1. **Construcción y Push de Imágenes**

   - Se construyeron las imágenes Docker del backend y Celery.
   - Cada imagen fue enviada a su respectivo **ECR (Elastic Container Registry)**.
   - Ejemplo de push exitoso:
     ```
     docker push 034739223309.dkr.ecr.us-east-1.amazonaws.com/tesis-dev-backend:dev-latest
     docker push 034739223309.dkr.ecr.us-east-1.amazonaws.com/tesis-dev-celery:dev-latest
     ```

2. **Creación de Secretos**

   - Se creó un secreto en **AWS Secrets Manager** con la URL de conexión a la base de datos Postgres en RDS.
   - El secreto se inyecta automáticamente a las tareas de ECS para que Django pueda conectarse a la base de datos.
   - Ejemplo del secreto generado:
     ```
     arn:aws:secretsmanager:us-east-1:034739223309:secret:tesis-dev-database-url-1JJ50L
     ```

3. **Provisionamiento con Terraform**

   - Se aplicaron los módulos de Terraform (`make tf-apply`), lo que creó/actualizó:
     - **ECS Cluster** (`tesis-dev-cluster`)
     - **Servicios ECS** (`tesis-dev-svc-backend`, `tesis-dev-svc-celery`)
     - **RDS (Postgres)** con endpoint privado
     - **Redis (ElastiCache)**
     - **ALB (Application Load Balancer)** con DNS público
   - Terraform devolvió como `outputs` las URLs y ARNs clave (ECR, RDS, Redis, ALB, Secret ARN).

4. **Esperando Estabilidad de ECS**

   - Se verificó que los servicios de ECS estuvieran en estado `running`:
     ```
     make aws-wait-ecs
     ```
     Resultado:
     ```json
     {
       "name": "tesis-dev-svc-backend",
       "desired": 1,
       "running": 1,
       "deployments": 1
     }
     ```

5. **Chequeo del ALB**

   - Se esperó a que el ALB respondiera con código `200 OK` en el endpoint `/healthz`:
     ```
     make aws-wait-alb
     ```
   - El balanceador quedó disponible en:
     ```
     http://tesis-dev-alb-1295731637.us-east-1.elb.amazonaws.com
     ```

6. **Smoke Tests**
   - Se ejecutaron pruebas rápidas de salud:
     ```
     make smoke-quick
     ```
   - Respuesta exitosa:
     ```json
     {
       "status": "ok",
       "marker": "v3"
     }
     ```

## Resultado

✅ Con estos pasos:

- El backend y Celery quedaron desplegados en ECS.
- La base de datos RDS y Redis están accesibles desde los contenedores.
- El ALB expone el backend públicamente y responde correctamente.
- Se confirmó que el despliegue es funcional mediante healthchecks y smoke tests.

## Próximos pasos

- Realizar **pruebas funcionales** contra endpoints del backend.
- Monitorear logs en **CloudWatch** y métricas en ECS/RDS.
- Integrar el **frontend** apuntando al `backend_url` del ALB.
