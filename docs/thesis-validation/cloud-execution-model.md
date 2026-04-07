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
- resuelve credenciales desde la plataforma (`AWS_PROFILE`, variables de entorno o task role)
- no modela todavía una conexión cloud por usuario/curso/equipo

Además, antes de este ajuste un profesor podía ver planes de su curso y también disparar `deploy` real sobre un laboratorio de un alumno, lo que mezclaba visibilidad académica con autoridad sobre infraestructura.

## Decisión recomendada

Separar dos cosas:

1. permisos de lectura/revisión del laboratorio
2. permisos para ejecutar infraestructura real

Regla propuesta:

- el `owner` del laboratorio es también el `execution owner`
- el `deploy` real y `destroy` usan la conexión cloud del `execution owner`
- profesores pueden ver, revisar y validar en modo `PLAN` los canvas de sus estudiantes
- profesores no deben ejecutar `APPLY` real ni `DESTROY` sobre cuentas cloud de estudiantes salvo delegación explícita
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

## Proyección multi-cloud

La arquitectura ya va en la dirección correcta porque existen `providers` y `executors`.

La extensión natural es:

- resolver una `CloudConnection` según `provider + execution owner`
- inyectar credenciales temporales al executor correspondiente
- mantener la misma política de autorización:
  - ver/revisar no implica desplegar
  - desplegar depende de la conexión cloud asociada al owner de ejecución

## Cambio aplicado en este corte

En este repo se dejó resuelta la política inmediata:

- usuarios visibles del curso pueden seguir revisando y validando en `PLAN`
- solo el dueño del laboratorio o un `platform_admin` pueden lanzar `APPLY` real o `DESTROY`

Además, este corte agrega una primera versión operativa de `bring-your-own-cloud` para `AWS`:

- modelo `CloudConnection`
- conexiones personales del usuario
- conexiones compartidas por curso
- selección opcional de conexión al crear o editar un laboratorio
- resolución backend de credenciales para que el deploy no dependa del computador ni de la IP del usuario

Límite actual:

- solo `AWS`
- autenticación real implementada con `access key + secret key`
- multi-cloud y mecanismos como `assume role` quedan como siguiente iteración
