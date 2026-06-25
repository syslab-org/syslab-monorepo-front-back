# Backend

## 1. Stack real

Archivos base:

- `apps/backend/requirements.txt`
- `apps/backend/teg/settings.py`
- `apps/backend/teg/urls.py`

Tecnologias confirmadas:

- Django 4.1
- Django REST Framework
- Celery
- Redis
- Postgres o SQLite segun entorno
- boto3
- Jinja2
- `google-auth`
- `cryptography`

## 2. Rutas base reales

Archivo principal: `apps/backend/api/urls.py`

Endpoints relevantes:

- `POST /api/auth/login/`
- `POST /api/auth/login/google/`
- `POST /api/auth/logout/`
- `GET|POST /api/auth/register/<invite_token>/`
- `GET|PATCH /api/me/`
- `GET /api/providers/capabilities/`
- `POST /api/tasks/run/`
- `GET /api/tasks/status/<task_id>/`
- `POST /api/network/plan/`
- `POST /api/network/plans/<plan_id>/deploy/`
- `POST /api/network/plans/<plan_id>/destroy/`
- `POST /api/network/plans/destroy-last/`
- CRUD REST para `labs`, `courses`, `users`, `cloud-connections`, `execution-delegations`
- catalogos `settings/amis` y `settings/key-pairs`
- `GET /healthz/`

Separacion importante:

- `/django-admin/`: admin server-side de Django
- `/admin/*`: rutas del dashboard SPA en frontend

## 3. Modelo de dominio confirmado

Archivo principal: `apps/backend/api/models.py`

Entidades clave:

- `Course`
- `CloudConnection`
- `UserProfile`
- `Lab`
- `KeyPairCatalogEntry`
- `Plan`
- `CloudExecutionDelegation`
- `PlanExecutionRecord`

Regla central:

- `Lab` representa el espacio de trabajo persistido del usuario,
- `Plan` representa la unidad operativa y desplegable asociada a ese laboratorio.

## 4. Auth y onboarding reales

Archivo principal: `apps/backend/api/auth_views.py`

Flujos confirmados:

- login por email y password,
- login por Google si el servidor tiene soporte configurado,
- registro por invitacion,
- actualizacion del perfil autenticado.

Realidad importante:

- no hay registro abierto publico,
- el flujo de alta depende de `invite_token`,
- un usuario puede existir en estado `pending` antes de activar password.

## 5. Roles y permisos

Archivo principal: `apps/backend/api/permissions.py`

Roles canonicos:

- `platform_admin`
- `teacher`
- `student`

Capacidades confirmadas:

- visibilidad de labs por rol,
- permisos separados para ver, editar y ejecutar,
- permisos para conexiones cloud y key pairs,
- delegacion explicita de ejecucion sobre labs.

Hallazgo importante:

- editar un lab no implica poder ejecutar infraestructura real,
- la ejecucion depende del owner, del curso, de la conexion cloud y de posibles delegaciones.

## 6. Planes y ejecucion

Archivos principales:

- `apps/backend/api/views.py`
- `apps/backend/api/views_plans.py`
- `apps/backend/api/tasks.py`

Estados reales de `Plan`:

- `PENDING`
- `RUNNING`
- `SUCCESS`
- `FAILURE`

Acciones reales de `Plan`:

- `plan`
- `apply`
- `destroy`
- `canvas_update`

Esto corrige documentacion historica que hablaba de estados como `ACTIVE`, `DESTROYED` o `PREVIEW`.

## 7. Ejecucion asincrona real

`process_network_plan` hace, en esencia:

1. resuelve el plan y su provider,
2. resuelve la `CloudConnection` efectiva,
3. construye runtime env,
4. prepara workspace Terraform,
5. ejecuta preflight,
6. corre `plan` o `apply`,
7. persiste logs, outputs, contexto de apply e historial.

Tambien existe:

- historial auditado con `PlanExecutionRecord`,
- `auto_destroy` programado por curso,
- reconciliacion de tareas que quedaron colgadas.

## 8. Providers reales

Archivos principales:

- `apps/backend/api/providers/registry.py`
- `apps/backend/api/providers/runtime_registry.py`
- `apps/backend/api/providers/connection_registry.py`

Estado confirmado:

- `AWS`: adapter, executor, runtime hooks y `CloudConnection` reales.
- `GCP`: adapter y executor registrados, pero runtime y connection spec siguen planificados.
- `Azure`: adapter y executor registrados, pero runtime y connection spec siguen planificados.

## 9. Compatibilidad legacy

Sigue implementada compatibilidad para:

- `legacy_canvas_id` en `Lab`,
- `firestore_vpc_id` en serializacion y modelos como alias de `canvas_id`,
- `sync_from_canvas` como alias legacy del endpoint canonico.

## 10. Hallazgos importantes

- `apps/backend/README.md` esta bastante alineado con el backend real.
- la parte multi-cloud esta bien encapsulada en arquitectura, pero no en capacidad operativa real.
- el backend ya modela mejor auditoria y control de ejecucion que varios documentos historicos.
