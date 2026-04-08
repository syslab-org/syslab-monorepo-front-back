# Matriz Formal de Permisos y Control de Usuarios

Esta matriz deja explícito qué puede hacer cada rol según el tipo de conexión cloud efectiva del laboratorio.

## Principios base

- ver un laboratorio no implica poder ejecutar infraestructura real
- `PLAN` es validación académica y técnica sin crear recursos
- `APPLY` y `DESTROY` son acciones operativas sobre una cuenta cloud
- el criterio clave es la conexión efectiva del laboratorio:
  - `personal`
  - `course_shared`
- la delegación explícita solo aplica sobre cuentas personales y debe quedar auditada

## Matriz resumida

| Rol / escenario | Ver lab | Editar lab | PLAN | APPLY | DESTROY |
|---|---:|---:|---:|---:|---:|
| Alumno owner sobre su lab | Sí | Sí | Sí | Sí | Sí |
| Profesor del curso sobre lab de alumno con conexión `personal` | Sí | Sí | Sí | No | No |
| Profesor del curso sobre lab de alumno con conexión `personal` y delegación activa | Sí | Sí | Sí | Sí | Sí |
| Profesor del curso sobre lab de alumno con conexión `course_shared` | Sí | Sí | Sí | Sí | Sí |
| `platform_admin` | Sí | Sí | Sí | Sí | Sí |
| Alumno sobre lab de otro curso | No | No | No | No | No |

## Lectura por actor

### Alumno

- puede crear y editar sus laboratorios
- puede registrar conexión personal
- puede usar conexión compartida del curso si la ve y el laboratorio la resuelve
- puede ejecutar `PLAN`, `APPLY` y `DESTROY` sobre su propio laboratorio

### Profesor

- puede ver labs y planes de su curso
- puede editar labs de su curso para acompañar la revisión
- puede ejecutar `PLAN` siempre que tenga visibilidad
- no puede ejecutar sobre una cuenta personal del alumno por defecto
- sí puede ejecutar si:
  - la conexión efectiva es `course_shared`
  - o existe una delegación explícita activa del alumno hacia el profesor

### Platform admin

- conserva capacidad total operativa
- puede crear y gestionar conexiones
- puede ejecutar sin depender del owner o de la delegación

## Regla de resolución cloud

La conexión efectiva del laboratorio sigue este orden:

1. conexión fijada explícitamente en el laboratorio
2. conexión personal activa del owner
3. conexión compartida activa del curso

Esto impacta directamente la autorización:

- si el resultado es `personal`, el profesor queda bloqueado salvo delegación explícita
- si el resultado es `course_shared`, el profesor del curso puede ejecutar

## Guardrail por cambio de cuenta cloud

Si un laboratorio tuvo un `APPLY` real y luego cambia su conexión efectiva a otra cuenta cloud:

- el estado anterior pasa a ser histórico
- la UI lo marca como `target_changed`
- `APPLY` y `DESTROY` reales se bloquean para evitar operar sobre una cuenta distinta a la del último despliegue

Esto evita un error sutil pero crítico:

- creer que un laboratorio sigue `ACTIVE` en la cuenta actual cuando en realidad esa infraestructura fue creada bajo otra conexión cloud

## Delegación explícita y auditable

La delegación implementada en este corte es:

- específica por laboratorio
- asociada a la conexión personal resuelta del owner
- orientada a habilitar al docente titular del curso
- revocable
- opcionalmente con expiración

La delegación queda auditada en:

- modelo `CloudExecutionDelegation`
- historial `PlanExecutionRecord`
- `Plan Detail -> Historial reciente de ejecuciones`

## Señales visibles en la UI

### Antes del deploy

`Plan Detail -> Próxima ejecución real`

Permite validar:

- provider
- source
- scope
- cuenta AWS prevista
- `ARN` conocido

### Después del deploy

`Plan Detail -> Evidencia del último APPLY real`

Permite validar:

- qué conexión se usó
- cuenta AWS
- `ARN`
- `credential_source`

### Historial

`Plan Detail -> Historial reciente de ejecuciones`

Permite validar:

- quién disparó la acción
- si fue `PLAN`, `APPLY` o `DESTROY`
- si fue `preview` o `real`
- si hubo delegación
- con qué cuenta/`ARN` corrió

## Riesgos que esta matriz evita

- que un profesor haga deploy accidental sobre la cuenta personal del alumno
- que una cuenta compartida del curso quede bloqueada para corrección o demo
- que no exista trazabilidad de quién ejecutó infraestructura real
- que la autorización dependa de la IP del computador del usuario

## Límite actual

- la delegación explícita se expone hoy en backend/admin/API y auditoría
- el flujo de autoservicio UI para crear/revocar delegaciones puede mejorarse como siguiente iteración
