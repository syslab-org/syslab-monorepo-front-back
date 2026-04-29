# Guia Tecnica Consolidada del Proyecto

Este documento reemplaza la necesidad de leer multiples notas dispersas para entender como esta armado el proyecto hoy. La idea es que funcione como una guia tecnica ordenada, basada en el codigo actual del repositorio, explicando:

- como se organiza el monorepo
- que hace cada area funcional
- como viaja la informacion desde la UI hasta AWS
- que tecnologias participan en cada etapa
- que partes de la documentacion historica siguen alineadas y cuales quedaron desactualizadas

## 1. Resumen ejecutivo

El proyecto es una plataforma educativa para modelar laboratorios de red desde un canvas visual, validarlos como topologias cloud y desplegarlos en AWS. La arquitectura actual es claramente `AWS-first`, aunque ya existe una capa de abstraccion para futuros providers.

El flujo principal hoy es:

1. un usuario autenticado crea un `Lab`
2. modela una topologia en el canvas del frontend
3. el frontend transforma ese canvas a una topologia neutral
4. el backend sincroniza esa topologia con un `Plan`
5. el backend compila esa intencion neutral al payload AWS actual
6. una tarea Celery ejecuta `terraform plan`, `terraform apply` o `terraform destroy`
7. el frontend consulta el estado del `Plan` y muestra logs, outputs, historial y contexto de ejecucion

El estado real del proyecto hoy no es "multi-cloud operativo". La parte operativa real esta implementada para `AWS`. `GCP` y `Azure` existen como estructura arquitectonica y como contratos de extension, pero no tienen runtime funcional.

## 2. Estructura del monorepo

La estructura principal del repo es esta:

- `apps/frontend/`: SPA en React + Vite + MUI + React Flow
- `apps/backend/`: API en Django REST + Celery
- `infra/bootstrap/`: bootstrap de Terraform para state remoto
- `infra/terraform/`: infraestructura AWS del entorno de plataforma
- `tools/docker/`: Dockerfiles y `compose.dev.yml`
- `docs/`: documentacion funcional, de tesis y validacion
- `scripts/`: helpers operativos y utilitarios

Como lectura mental rapida:

- el `frontend` modela laboratorios y consume la API
- el `backend` es la fuente de verdad de usuarios, cursos, labs, planes y ejecuciones
- `Celery` saca del request HTTP todo lo pesado de Terraform
- `Terraform` aparece en dos capas distintas:
  - `infra/terraform/` despliega la plataforma misma
  - `apps/backend/provisioning/templates/` genera la infraestructura del laboratorio del usuario

## 3. Stack tecnologico actual

### Frontend

Archivo base: `apps/frontend/package.json`

Tecnologias principales:

- React 18
- Vite
- React Router
- Material UI
- Zustand
- `@xyflow/react` para el canvas tipo diagrama de red
- `react-hook-form` + `yup` para formularios

Observacion importante:

- existen dependencias como `firebase` y `axios` en `package.json`, pero el flujo principal actual usa `fetch` a traves de `apps/frontend/src/infrastructure/http/api.js`

### Backend

Archivo base: `apps/backend/requirements.txt`

Tecnologias principales:

- Django 4.1
- Django REST Framework
- Celery
- Redis
- Postgres o SQLite segun entorno
- boto3
- Jinja2
- cryptography
- google-auth

### Infra y runtime

- Docker Compose para entorno local
- AWS ECS/Fargate para runtime de backend y celery
- AWS ALB
- AWS RDS Postgres
- AWS ElastiCache Redis
- AWS ECR
- AWS S3
- AWS IAM / STS / AssumeRole
- Terraform

## 4. Modelo conceptual del sistema

Los conceptos mas importantes del sistema son estos:

- `User` y `UserProfile`: autenticacion, rol, estado, curso, ajustes
- `Course`: agrupa estudiantes y docente
- `CloudConnection`: credenciales o acceso AWS para ejecucion real
- `Lab`: laboratorio persistido, visible en la UI, asociado a owner, curso, flujo y configuracion
- `Plan`: unidad operativa desplegable asociada a un laboratorio/canvas
- `CloudExecutionDelegation`: permiso explicito para que otra persona ejecute infraestructura real sobre un lab
- `PlanExecutionRecord`: historial auditado de cada `plan`, `apply` o `destroy`

La regla arquitectonica mas importante es:

- `Lab` representa el espacio de trabajo y la intencion del usuario
- `Plan` representa el estado operativo y desplegable de ese lab

## 5. Backend: como esta organizado

### 5.1 Punto de entrada

Archivos base:

- `apps/backend/teg/settings.py`
- `apps/backend/teg/urls.py`
- `apps/backend/api/urls.py`

La API publica vive bajo `/api/` y expone:

- autenticacion
- perfil del usuario
- laboratorios
- planes
- cursos
- usuarios
- conexiones cloud
- delegaciones de ejecucion
- catalogo de AMIs
- catalogo de key pairs
- capacidades de providers

Ademas existe `GET /healthz/` para healthcheck.

### 5.2 Configuracion de entorno

`apps/backend/teg/settings.py` muestra tres rasgos importantes:

1. la base de datos se resuelve por `DATABASE_URL`
2. si no existe `DATABASE_URL`, puede armarse desde variables `POSTGRES_*`
3. si tampoco existen, cae a SQLite

En desarrollo Docker local, el backend usa Postgres local del compose. En ECS, la idea es usar `DATABASE_URL` via env o via Secrets Manager.

Tambien se configura:

- `TokenAuthentication` y `SessionAuthentication`
- CORS abierto en `DEBUG=true`
- Redis como broker y result backend de Celery

### 5.3 Autenticacion y cuentas

Archivo principal: `apps/backend/api/auth_views.py`

El proyecto soporta:

- login con email y password
- login con Google, si el servidor tiene soporte configurado
- registro por invitacion
- perfil del usuario autenticado

El flujo real de alta de usuarios es:

1. un admin o docente crea un usuario
2. el backend crea `User` con password inutilizable
3. genera `invite_token` en `UserProfile`
4. el usuario entra por `/registration/:token`
5. completa password
6. la cuenta queda `ACTIVE`

Esto significa que hoy no existe un registro abierto de usuarios final. Hay onboarding por invitacion.

### 5.4 Roles, visibilidad y permisos

Archivos principales:

- `apps/backend/api/models.py`
- `apps/backend/api/permissions.py`

Roles canonicos:

- `platform_admin`
- `teacher`
- `student`

Estados de usuario:

- `pending`
- `active`
- `deactivated`

Las reglas mas relevantes hoy son:

- `platform_admin` ve y opera todo
- `teacher` ve y edita labs de su curso, y tambien los propios
- `student` ve lo propio y, si corresponde, labs visibles del curso

Muy importante:

- ver un lab no implica poder ejecutar infraestructura real
- editar un lab no implica poder hacer `apply`

La ejecucion real depende de:

- owner del lab
- conexion cloud efectiva
- curso
- rol del usuario
- delegacion explicita si aplica

### 5.5 Cursos

Archivo principal: `apps/backend/api/views_courses.py`

`Course` sirve para:

- agrupar estudiantes
- asociar un docente responsable
- colgar conexiones compartidas del curso
- colgar labs de curso

Hoy el backend soporta:

- listar cursos visibles segun rol
- crear curso
- editar curso
- matricular estudiante
- remover estudiante

### 5.6 Cloud connections

Archivos principales:

- `apps/backend/api/models.py`
- `apps/backend/api/views_cloud_connections.py`
- `apps/backend/api/cloud_connections.py`

`CloudConnection` es el modelo que resuelve con que identidad AWS se ejecuta Terraform.

Tipos de alcance:

- `personal`
- `course_shared`

Tipos de autenticacion AWS:

- `aws_static_keys`
- `aws_assume_role`

Como funciona hoy:

- si la conexion es por static keys, el backend guarda `access_key_id` y el secreto cifrado
- si la conexion es por assume role, guarda `role_arn` y `external_id` cifrado
- la prueba de conexion hace `sts:GetCallerIdentity`
- el backend resuelve la conexion efectiva del lab antes de `apply` o `destroy`

Orden de resolucion actual:

1. conexion explicita fijada en el lab
2. conexion personal activa del owner
3. conexion compartida activa del curso

Esto esta implementado en `resolve_lab_cloud_connection_with_source`.

### 5.7 Labs

Archivo principal: `apps/backend/api/views_labs.py`

`Lab` es la entidad que representa el laboratorio visible en producto.

Guarda:

- nombre
- owner
- curso
- conexion cloud explicita opcional
- provider objetivo
- `flow` del canvas
- `intent`
- `metadata`
- `capabilities`
- `provider_overrides`
- CIDR base y region
- narrativa (`advanced` o `wizard`)
- plantilla elegida

Hay un detalle historico importante:

- el identificador canonico visible sigue expuesto como `canvas_id`
- internamente se mantiene `legacy_canvas_id` para compatibilidad con ids historicos

### 5.8 Planes

Archivos principales:

- `apps/backend/api/models.py`
- `apps/backend/api/views_plans.py`
- `apps/backend/api/views.py`

`Plan` es la pieza central del runtime.

Responsabilidades reales de `Plan`:

- guardar el payload compilado
- recordar el `canvas_id`
- recordar si hubo `apply` real
- recordar `outputs`
- guardar `last_log`
- guardar `last_apply_context`
- mantener `task_id` y estados

Regla clave del sistema:

- hoy existe una restriccion de unicidad para `canvas_id`
- eso implementa el principio `1 canvas = 1 plan`

Estados de `Plan`:

- `PENDING`
- `RUNNING`
- `SUCCESS`
- `FAILURE`

Ultimas acciones relevantes:

- `plan`
- `apply`
- `destroy`
- `canvas_update`

### 5.9 Historial y auditoria de ejecucion

Modelos principales:

- `CloudExecutionDelegation`
- `PlanExecutionRecord`

Cada ejecucion crea un `PlanExecutionRecord` con:

- quien la pidio
- si fue preview o ejecucion real
- provider
- conexion cloud resuelta
- scope
- source de resolucion
- cuenta AWS
- ARN
- error

El `Plan` ademas guarda `last_apply_context`, que es el snapshot del ultimo `APPLY` real exitoso o intentado con evidencia de identidad.

### 5.10 Delegacion explicita

Archivo principal: `apps/backend/api/views_execution_delegations.py`

La delegacion actual sirve para un caso muy concreto:

- un owner con conexion personal puede delegar ejecucion real al docente titular del curso

Restricciones importantes:

- solo aplica a labs pertenecientes a un curso
- solo aplica a conexiones personales del owner
- solo puede delegarse a un docente
- queda auditable
- puede revocarse

No existe hoy una pagina dedicada en frontend para administrar delegaciones. La funcionalidad esta expuesta por backend y se ve reflejada en el historial del `Plan Detail`.

## 6. Backend: flujo real del plan

### 6.1 Crear o sincronizar un plan desde el canvas

Endpoints involucrados:

- `POST /api/network/plan/`
- `POST /api/network/plans/sync-from-canvas/`

Comportamiento actual:

- el frontend usa principalmente `sync-from-canvas`
- el backend valida el payload
- normaliza aliases legacy como `firestore_vpc_id`, `vpcId` y `vlan.id`
- asegura que exista un `Lab`
- crea o actualiza el `Plan` asociado al `canvas_id`

Cuando cambia el payload o el hash del canvas, el backend marca el plan como `PENDING` y `last_action = canvas_update`.

### 6.2 Validacion logica y compilacion

Archivos principales:

- `apps/backend/api/domain/network_intent.py`
- `apps/backend/api/validators.py`
- `apps/backend/api/providers/aws/adapter.py`

La validacion se hace en capas:

1. el frontend arma una topologia neutral
2. `normalize_network_intent` la convierte a un contrato de dominio uniforme
3. el adapter del provider valida y compila esa intencion
4. el resultado final hoy sigue siendo un payload AWS-oriented para Terraform

Eso es importante porque el dominio neutral ya existe, pero el runtime de Terraform todavia consume un formato AWS legacy-compilado.

### 6.3 Providers

Archivos principales:

- `apps/backend/api/providers/registry.py`
- `apps/backend/api/providers/aws/*`
- `apps/backend/api/providers/gcp/*`
- `apps/backend/api/providers/azure/*`

Estado actual:

- `aws`: adapter y executor funcionales
- `gcp`: adapter planned, sin compile real
- `azure`: adapter planned, sin compile real

La vista `/api/providers/capabilities/` devuelve exactamente ese estado al frontend.

### 6.4 Deploy preview y apply real

Archivo principal: `apps/backend/api/views.py`

`deploy_plan` recibe `simulate_only`.

Dos modos:

- `simulate_only=true`: corre un `terraform plan`
- `simulate_only=false`: corre `terraform apply`

Guardrails relevantes:

- no permite correr si el plan ya esta `RUNNING`
- para `apply` real exige `can_execute_plan`
- bloquea `apply` real si la cuenta cloud actual ya no coincide con la del ultimo `APPLY` real
- puede reconciliar drift si el plan estaba `applied=true` pero ya no encuentra VPCs en AWS

### 6.5 Destruccion

Archivos principales:

- `apps/backend/api/views.py`
- `apps/backend/api/tasks.py`

`destroy_plan`:

- exige permisos de ejecucion real
- valida mismatch de cuenta cloud
- bloquea si el plan no tiene infraestructura destruible
- encola una tarea Celery que ejecuta `terraform destroy`

Despues intenta limpieza extra de NAT residual.

### 6.6 Tareas Celery

Archivo principal: `apps/backend/api/tasks.py`

Las dos tareas importantes son:

- `process_network_plan`
- `destroy_last_deploy`

`process_network_plan` hace:

1. resolver provider y runtime env
2. crear bundle de ejecucion
3. preparar workspace Terraform temporal
4. correr preflight AWS
5. hacer `terraform init`
6. hacer `terraform plan`
7. si corresponde, hacer `terraform apply`
8. guardar logs, outputs y auditoria

`destroy_last_deploy` hace:

1. reconstruir workspace desde el payload persistido
2. hacer `terraform init`
3. hacer `terraform destroy`
4. limpiar NAT residual si corresponde
5. marcar el plan como destruido o fallido

### 6.7 Runtime AWS

Archivos principales:

- `apps/backend/api/cloud_connections.py`
- `apps/backend/api/providers/aws/executor.py`
- `apps/backend/api/providers/aws/runtime.py`
- `apps/backend/provisioning/templates/main.tf.j2`

Puntos clave:

- el backend puede construir `runtime_env` AWS desde una `CloudConnection`
- si la conexion es `AssumeRole`, usa una identidad base y llama `sts:AssumeRole`
- el executor AWS prepara un directorio temporal con `main.tf`, estado y dumps de debug
- los logs de Terraform se persisten en `Plan.last_log`
- los outputs quedan persistidos en `Plan.outputs`

## 7. Frontend: como esta organizado

### 7.1 Shell principal

Archivos principales:

- `apps/frontend/src/App.jsx`
- `apps/frontend/src/app/routes/DashboardRoutes.jsx`
- `apps/frontend/src/app/providers/AuthContext.jsx`

La SPA usa:

- `BrowserRouter`
- un `AuthProvider`
- `ProtectedRoute` para secciones privadas

Rutas funcionales importantes:

- `/login`
- `/registration/:token`
- `/admin/dashboard`
- `/admin/labs`
- `/admin/labs/:labId/canvas`
- `/admin/plans`
- `/admin/plans/:id`
- `/admin/settings/*`

### 7.2 Cliente HTTP

Archivo principal: `apps/frontend/src/infrastructure/http/api.js`

El frontend usa una capa de API que:

- toma `VITE_API_URL`
- inyecta `Token` en headers
- muestra mensajes de loading para mutaciones
- centraliza endpoints de auth, labs, plans, cloud connections, cursos, AMIs y key pairs

Actualmente el transporte real es `fetch`, no `axios`.

### 7.3 Estado global relevante

Estados importantes:

- `AuthContext`: usuario autenticado y sesion
- `LoadingFlowContext`: overlay/mensaje de procesos largos
- `OnboardingTourContext`: recorridos guiados
- `WizardContext`: modo guiado de creacion de lab
- `canvasLabStore` con Zustand: CIDR maestro, nombre, provider objetivo y target de ejecucion resuelto

### 7.4 Pagina de laboratorios

Archivo principal: `apps/frontend/src/features/networkCanvas/pages/LabsPage.jsx`

Desde aqui el usuario puede:

- listar labs visibles
- crear laboratorio
- duplicar laboratorio
- renombrarlo
- editar CIDR / region / cloud connection
- entrar al canvas

Tambien carga conexiones cloud para que el laboratorio pueda quedar asociado a una cuenta AWS explicita.

### 7.5 Creacion de laboratorio y plantillas

Archivo principal: `apps/frontend/src/features/networkCanvas/pages/CreateLabModal.jsx`

Al crear un laboratorio, el frontend:

- consulta cursos y conexiones cloud
- consulta capacidades de providers
- decide si el lab sera `wizard` o `advanced`
- puede precargar un `flow` inicial si se eligio plantilla

Archivo importante:

- `apps/frontend/src/features/networkCanvas/utils/labTemplates.js`

Estado real actual:

- ya existen plantillas funcionales que precargan canvas
- no es solo metadata
- se importan desde `apps/frontend/examples/network-scenarios/generated-canvas/`

Esto es una diferencia importante con documentacion vieja que todavia lo presentaba como trabajo pendiente.

### 7.6 Canvas de red

Archivo principal:

- `apps/frontend/src/features/networkCanvas/pages/CanvasFlowPage.jsx`

El canvas es la parte mas rica del frontend. Usa:

- React Flow
- controladores propios
- formularios por tipo de nodo
- paneles de preview
- restauracion y guardado de flow
- polling del estado del plan

Funciones principales del canvas:

- editar nodos y edges
- configurar VPCs, subnets, workloads y routers
- persistir `flow` en backend
- detectar si el canvas quedo "dirty"
- restaurar desde backend o localStorage
- preparar validacion y despliegue

### 7.7 Guardado y restauracion del flow

Archivos principales:

- `apps/frontend/src/features/networkCanvas/core/useSaveFlow.js`
- `apps/frontend/src/features/networkCanvas/core/useRestoreFlow.js`

Comportamiento actual:

- el flow vive principalmente en `Lab.flow`
- tambien se guarda en `localStorage` como cache de apoyo
- al restaurar, el frontend prioriza `api.getLab(labId)`
- si existe flow guardado en backend, lo usa como fuente principal

### 7.8 Transformacion del canvas a topologia neutral

Archivo principal:

- `apps/frontend/src/features/networkCanvas/core/useDeployNetwork.js`

Este archivo concentra la logica mas importante del frontend.

Lo que hace:

1. valida la topologia del canvas
2. extrae VPCs, subnets e instancias desde nodos
3. extrae peering o TGW desde edges y routers
4. construye un payload neutral `topology`
5. lo sincroniza con backend
6. lanza preview o apply real

El payload que construye incluye:

- `target_provider`
- `canvas_id`
- `metadata`
- `topology.network`
- `topology.segments`
- `topology.connectivity`

Ese es el puente entre el modelo visual del frontend y el dominio neutral del backend.

### 7.9 Validacion y deploy desde frontend

Todavia dentro de `useDeployNetwork.js`, el flujo de usuario es:

1. `processJsonToCloud()` construye el payload neutral
2. `handleValidatePlan()` hace `sync-from-canvas`
3. luego llama `deployPlan(... simulateOnly=true)`
4. hace polling hasta que el plan termine
5. resume riesgo leyendo logs del `terraform plan`
6. si el usuario confirma, `handleApplyReal()` vuelve a sincronizar y llama `deployPlan(... simulateOnly=false)`

Esto explica por que la UI separa:

- validar
- desplegar
- abrir detalle del plan

### 7.10 Plan Detail

Archivo principal:

- `apps/frontend/src/features/plans/pages/PlanDetailPage.jsx`

Es la pantalla de observabilidad operativa.

Muestra:

- estado general del plan
- si esta activo, destruido, en preview o en recovery
- outputs
- logs
- contexto de la ultima ejecucion real
- target cloud resuelto
- historial reciente de ejecuciones

En otras palabras:

- `CanvasFlowPage` sirve para modelar
- `PlanDetailPage` sirve para operar, auditar y entender que paso

### 7.11 Settings funcionales

Paginas relevantes:

- usuarios
- cursos
- conexiones cloud
- catalogo de AMIs
- catalogo de key pairs

Hoy estas paginas soportan el camino principal del MVP:

- gestionar identidades y roles
- asociar alumnos a cursos
- registrar cuentas AWS personales o compartidas
- registrar AMIs reutilizables
- registrar key pairs disponibles para workloads

## 8. Flujo end-to-end explicado paso a paso

Esta es la mejor manera de leer el sistema completo:

### Paso 1. Crear un laboratorio

La UI crea un `Lab` via `POST /api/labs/`.

El backend decide:

- owner
- curso
- visibilidad
- provider objetivo
- narrativa
- conexion cloud inicial si fue seleccionada

### Paso 2. Editar el canvas

El usuario modifica:

- VPCs
- subnets
- workloads
- routers
- rutas

El resultado visual se persiste en `Lab.flow`.

### Paso 3. Construir topologia neutral

El frontend transforma el canvas a una topologia neutral con:

- red base
- segmentos
- zonas
- workloads
- conectividad directa o por hub

### Paso 4. Sincronizar el plan

El frontend llama `sync-from-canvas`.

El backend:

- valida la estructura
- asegura el `Lab`
- crea o actualiza el `Plan`
- guarda `canvas_hash`

### Paso 5. Validar en modo preview

El frontend llama `deployPlan(simulateOnly=true)`.

El backend:

- crea `PlanExecutionRecord`
- encola una tarea Celery
- Celery ejecuta `terraform plan`
- persiste logs y estado

### Paso 6. Aplicar en AWS

Si el usuario tiene permisos y confirma, el frontend llama `deployPlan(simulateOnly=false)`.

El backend:

- resuelve la `CloudConnection`
- valida permisos reales
- valida target cloud
- construye credenciales runtime
- Celery ejecuta `terraform apply`
- persiste `outputs`
- persiste `last_apply_context`

### Paso 7. Monitorear el resultado

El frontend consulta el `Plan` y muestra:

- estado
- logs
- outputs
- historial
- evidencia de cuenta cloud usada

### Paso 8. Destruir

La UI dispara `destroy`.

El backend repite la logica de permisos y target cloud, y Celery ejecuta `terraform destroy`.

## 9. Infraestructura de desarrollo y despliegue de la plataforma

### 9.1 Docker Compose local

Archivo principal:

- `tools/docker/compose.dev.yml`

Servicios actuales:

- `frontend`
- `backend`
- `celery`
- `flower`
- `postgres`
- `redis`

Puntos clave:

- backend y celery montan `apps/backend`
- frontend monta `apps/frontend`
- backend y celery montan `~/.aws` en solo lectura
- en local se habilita `ALLOW_LOCAL_APPLY=1`
- backend usa Postgres local y Redis local

### 9.2 Makefile operativo

Archivo principal:

- `Makefile`

El `Makefile` hoy no es decorativo; es una capa operativa importante. Agrupa runbooks para:

- desarrollo local
- publicacion a ECR
- despliegue AWS
- smoke tests

Comandos representativos:

- `make up`
- `make migrate`
- `make push`
- `make aws-bootstrap`
- `make aws-redeploy`
- `make aws-stop`
- `make aws-down`

### 9.3 Terraform del entorno plataforma

Carpeta:

- `infra/terraform/`

Esta capa no despliega laboratorios del usuario. Despliega la plataforma donde corren backend y celery.

Recursos actuales que si existen en codigo:

- VPC del entorno
- subnets publicas
- Internet Gateway
- ALB
- target group
- ECS cluster
- servicios ECS para backend y celery
- task definitions
- ECR para backend y celery
- RDS Postgres
- ElastiCache Redis
- bucket S3 de planes
- secrets para `DATABASE_URL`
- IAM task role y execution role
- IAM OIDC para GitHub Actions

### 9.4 Bootstrap de Terraform

Carpeta:

- `infra/bootstrap/`

Esta capa crea el state remoto:

- bucket S3 para `tfstate`
- tabla DynamoDB para locks

### 9.5 Terraform de laboratorios

Carpeta y archivos principales:

- `apps/backend/provisioning/templates/main.tf.j2`
- `apps/backend/provisioning/templates/variables.tf.j2`
- `apps/backend/provisioning/terraform_runner.py`

Esta es otra capa distinta a `infra/terraform/`.

Sirve para:

- renderizar Terraform dinamico del laboratorio del usuario
- ejecutar `plan/apply/destroy`
- manejar workspaces temporales por plan

## 10. Estado real multi-cloud

La arquitectura ya esta separando dominio y ejecucion, pero el runtime operativo real hoy es este:

- `AWS`: funcional
- `GCP`: planned
- `Azure`: planned

Eso significa:

- el frontend puede mostrar providers y capacidades
- el dominio neutral ya existe
- pero solo `AWS` tiene adapter + executor que llegan hasta Terraform real

## 11. Comparacion entre documentacion existente y codigo actual

Esta seccion resume donde la documentacion sigue bien y donde ya no describe fielmente el repo.

### 11.1 Documentacion que sigue alineada

- `docs/operacion/aws/redeploy-matrix.md`
  - sigue alineado con el foco `AWS-first`
  - sigue siendo coherente con la idea de `redeploy`, `OUTDATED`, `Plan Detail` y comportamiento Terraform
- `docs/tesis/validacion/cloud-execution-model.md`
  - sigue alineado con la logica de permisos reales en backend
- `docs/tesis/validacion/aws-cloud-connections-playbook.md`
  - sigue alineado con `Static Keys`, `AssumeRole` y evidencia en `Plan Detail`
- `docs/tesis/validacion/user-control-permissions-matrix.md`
  - sigue alineado con `can_execute_plan`, `course_shared` y delegacion

### 11.2 Documentacion parcialmente desactualizada

- `README.md`
  - sirve como bitacora general de infra y despliegue
  - pero ya no alcanza para describir bien la capa de dominio, permisos, auditoria y flujo del canvas
- `apps/backend/README.md`
  - da una buena intuicion del dominio neutral y la compatibilidad legacy
  - pero no cubre en detalle el flujo real de `CloudConnection`, `PlanExecutionRecord` y delegaciones
- `docs/tesis/mvp-thesis-plan.md`
  - describe correctamente varias decisiones de producto
  - pero contiene trabajo futuro que en codigo ya fue avanzado, por ejemplo la parte de plantillas de laboratorio

### 11.3 Documentacion claramente desactualizada

- `apps/frontend/README.md`
  - sigue siendo el README boilerplate de Vite
  - no documenta nada del sistema real
- `infra/terraform/README.md`
  - hoy describe basicamente ECR y el backend remoto de Terraform
  - pero el codigo actual ya provisiona una plataforma bastante mas completa: VPC, ALB, ECS, RDS, Redis, IAM, S3 y secrets

### 11.4 Hallazgos concretos de desalineacion

1. Plantillas de laboratorio
   - documentacion vieja: lo presenta como mejora pendiente
   - codigo actual: ya existe `buildTemplateFlow()` y se precargan flows reales desde ejemplos generados

2. Multi-cloud
   - parte de la documentacion puede sonar mas amplia a nivel conceptual
   - codigo actual: solo `AWS` es operativo; `GCP` y `Azure` son planned

3. Documentacion frontend
   - la documentacion actual del frontend no refleja el uso de React Flow, Zustand, roles, tours, validacion ni deploy

4. Documentacion de infra plataforma
   - la documentacion actual no refleja la cantidad real de recursos Terraform hoy presentes en `infra/terraform/`

## 12. Recomendacion de lectura si quieres entender el codigo rapido

Si alguien nuevo entra al repo, este es el mejor recorrido:

1. leer este documento completo
2. abrir `apps/frontend/src/features/networkCanvas/pages/CanvasFlowPage.jsx`
3. abrir `apps/frontend/src/features/networkCanvas/core/useDeployNetwork.js`
4. abrir `apps/backend/api/views.py`
5. abrir `apps/backend/api/tasks.py`
6. abrir `apps/backend/api/models.py`
7. abrir `apps/backend/api/cloud_connections.py`
8. abrir `apps/backend/api/providers/aws/adapter.py`
9. abrir `apps/backend/api/providers/aws/executor.py`
10. abrir `apps/backend/provisioning/templates/main.tf.j2`

## 13. Conclusiones tecnicas

El proyecto ya no es solo un canvas visual ni una demo CRUD. El codigo actual implementa un flujo bastante claro y serio de:

- modelado visual
- traduccion a dominio neutral
- compilacion AWS
- ejecucion asyncrona con Terraform
- permisos academicos separados de permisos cloud
- trazabilidad de ejecucion real

La mejor manera de describir el estado actual es esta:

- plataforma educativa de laboratorios cloud
- `AWS-first`
- arquitectura preparada para multi-cloud, pero no operativa aun fuera de AWS
- backend como fuente de verdad
- frontend como modelador y orquestador de experiencia
- Celery + Terraform como motor de ejecucion

Si en adelante se quiere mantener la documentacion ordenada, este archivo deberia pasar a ser el documento principal de entrada y los demas quedar como anexos de validacion, evidencias o runbooks especificos.
