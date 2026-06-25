# Modelo de Ejecución Cloud por Usuario

Este documento deja explícito cómo conviene resolver el `deploy` real cuando cada usuario debe operar con su propia cuenta cloud, partiendo por `AWS` y manteniendo extensibilidad a futuro para otros providers.

## Problema a resolver

Se requiere que:

- cada usuario autenticado pueda desplegar con sus propias credenciales cloud
- el MVP siga siendo `AWS-first`
- la revisión docente no rompa el principio de separación entre permisos académicos y permisos sobre una cuenta cloud

La pregunta clave no es la IP desde la que entra profesor o alumno, sino **qué identidad cloud autoriza el despliegue real**.

## Estado actual del repositorio

Hoy el runtime real:

- ejecuta sobre `AWS`
- modela conexiones cloud por usuario y por curso
- resuelve una conexión efectiva por laboratorio
- soporta autenticación `AWS Static Keys` y `AWS AssumeRole`
- sigue pudiendo usar credenciales base de la plataforma para el principal que asume un role

Hoy el modelo operativo implementado es:

- `CloudConnection` personal del usuario
- `CloudConnection` compartida por curso
- asociación explícita de conexión al laboratorio o resolución automática
- snapshot auditado del último `APPLY` real
- visibilidad en UI de la conexión efectiva antes del deploy

La política actual ya no mezcla visibilidad académica con autoridad cloud:

- alumnos pueden desplegar con su conexión personal
- profesores pueden revisar y validar en `PLAN`
- profesores pueden ejecutar `APPLY` y `DESTROY` sobre labs de alumnos solo si la conexión efectiva es `course_shared`
- sobre conexiones personales del alumno, el profesor sigue bloqueado salvo `platform_admin`

Además, el deploy real no depende del computador del usuario ni de su IP. Terraform y `boto3` corren en backend/celery usando la conexión cloud resuelta por la plataforma.

## Decisión recomendada

Separar dos cosas:

1. permisos de lectura/revisión del laboratorio
2. permisos para ejecutar infraestructura real

Regla propuesta:

- el `owner` del laboratorio es también el `execution owner`
- el `deploy` real y `destroy` usan la conexión cloud del `execution owner`
- profesores pueden ver, revisar y validar en modo `PLAN` los canvas de sus estudiantes
- profesores no deben ejecutar `APPLY` real ni `DESTROY` sobre cuentas cloud personales de estudiantes salvo delegación explícita
- profesores sí pueden ejecutar infraestructura real cuando el laboratorio usa una cuenta `course_shared` del curso
- `platform_admin` conserva capacidad operativa excepcional

## Implicancia para alumnos y profesores

### Alumno

- crea su laboratorio
- vincula su cuenta AWS
- valida con `PLAN`
- ejecuta `APPLY` y `DESTROY` en su propia cuenta

### Profesor

- puede revisar el canvas y el plan del alumno
- puede usar validación en modo `PLAN` porque no crea recursos reales
- no debería aplicar recursos reales en la cuenta del alumno por defecto

Si el profesor necesita desplegar para corrección o demostración, las opciones sanas son:

- clonar el laboratorio a un lab propio del profesor
- usar una cuenta AWS de curso compartida con delegación explícita
- transferir temporalmente la propiedad de ejecución, dejando auditoría

## Por qué la IP no debería ser el criterio

Si el acceso cloud se hace bien:

- con `assume-role`, federation o credenciales temporales, la IP del navegador del profesor no define la autorización
- la autorización la define la confianza entre plataforma y cuenta cloud
- por eso el criterio correcto es `quién es el execution owner`, no `desde qué IP se abrió la revisión`

## Diseño recomendado para AWS-first

Modelo mínimo futuro:

- `CloudConnection`
- `provider`: `aws | gcp | azure`
- `owner_type`: `user | team | course`
- `owner_id`
- `status`: `pending | active | error`
- `metadata`: cuenta, región default, alias, scopes
- `secret_ref`: referencia a secreto externo, nunca la credencial en texto plano

Para `AWS`, priorizar:

- `assume role` en vez de access keys permanentes
- validación con `sts:GetCallerIdentity`
- scopes mínimos por laboratorio/curso
- evidencia visible en UI de:
  - conexión efectiva
  - cuenta AWS prevista
  - `ARN` conocido antes del `APPLY`
  - snapshot auditado del último `APPLY` real

## Proyección multi-cloud

La arquitectura ya va en la dirección correcta porque existen `providers` y `executors`.

La extensión natural es:

- resolver una `CloudConnection` según `provider + execution owner`
- inyectar credenciales temporales al executor correspondiente
- mantener la misma política de autorización:
  - ver/revisar no implica desplegar
  - desplegar depende de la conexión cloud asociada al owner de ejecución

## Cambio aplicado en este corte

En este repo quedó resuelto lo siguiente:

- usuarios visibles del curso pueden seguir revisando y validando en `PLAN`
- el laboratorio puede resolver una conexión efectiva:
  - explícita en el lab
  - personal del owner
  - compartida del curso
- la UI expone `Próxima ejecución real` con provider, source, scope, región, cuenta prevista y `ARN` conocido
- cada `APPLY` real guarda evidencia auditada del contexto usado
- el profesor del curso puede ejecutar `APPLY`/`DESTROY` solo si la conexión efectiva es `course_shared`

Además, este corte agrega una primera versión operativa de `bring-your-own-cloud` para `AWS`:

- modelo `CloudConnection`
- conexiones personales del usuario
- conexiones compartidas por curso
- selección opcional de conexión al crear o editar un laboratorio
- resolución backend de credenciales para que el deploy no dependa del computador ni de la IP del usuario
- autenticación `AWS Static Keys`
- autenticación `AWS AssumeRole`

Escenarios ya validados manualmente:

- alumno con conexión personal `Static Keys`
- alumno con conexión personal `AssumeRole`
- profesor bloqueado cuando el lab del alumno usa conexión personal
- profesor habilitado cuando el lab usa conexión `course_shared`
- lectura de evidencia de ejecución desde `Plan Detail`
- guardrail cuando la conexión cloud actual cambia respecto del último `APPLY` real

Ejemplo validado en este ciclo:

- conexión efectiva: `assume-role-alumno22`
- `source`: `lab_explicit`
- `scope`: `personal`
- cuenta prevista: `034739223309`
- `ARN` conocido antes del deploy:
  - `arn:aws:sts::034739223309:assumed-role/syslab-alumno22-role/syslab-...`

Límite actual:

- solo `AWS`
- el flujo `AssumeRole` actual depende de una identidad base válida en backend para llamar `sts:AssumeRole`
- `GCP` y `Azure` siguen siendo roadmap
- multi-cloud sigue siendo extensibilidad arquitectónica, no capacidad cerrada del MVP

Referencia operativa:

- [Playbook de Conexiones Cloud AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/codigo-verificado/operacion/aws/cloud-connections-playbook.md)
- [Matriz Formal de Permisos y Control de Usuarios](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/codigo-verificado/06-permissions-matrix.md)
- [Hardening de AssumeRole e IAM Mínimo](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/codigo-verificado/operacion/aws/assumerole-hardening.md)
