# Modelo Vigente de Ejecucion Cloud

El backend ejecuta Terraform y `boto3`; la IP o el computador del usuario no determinan la identidad cloud. La autorizacion depende del usuario autenticado, el laboratorio y su `CloudConnection` efectiva.

## Alcance

- AWS es el unico provider ejecutable.
- GCP y Azure permiten modelado en el canvas, pero su runtime permanece `planned`.
- AWS admite `Static Keys` y `AssumeRole`.
- Las credenciales se resuelven en backend y no se envian al navegador.

## Resolucion de la conexion

El laboratorio resuelve la conexion activa en este orden:

1. conexion fijada explicitamente en el laboratorio;
2. conexion personal activa del owner;
3. conexion compartida activa del curso.

La UI muestra antes de una ejecucion real el provider, origen, scope, region, cuenta prevista y ARN conocido. Cada `APPLY` real persiste un snapshot del contexto usado.

## Autorizacion

- El owner puede ejecutar `PLAN`, `APPLY` y `DESTROY` sobre su laboratorio.
- Un profesor del curso puede revisar, editar y ejecutar `PLAN` sobre el laboratorio de un alumno.
- El profesor puede ejecutar `APPLY` y `DESTROY` cuando la conexion es `course_shared`.
- Sobre una conexion personal del alumno, el profesor necesita una delegacion explicita, activa y vigente.
- `platform_admin` conserva capacidad operativa excepcional.

Ver la [matriz de permisos](./06-permissions-matrix.md) para el detalle por actor.

## AssumeRole

Una conexion `AssumeRole` usa la identidad base configurada en backend para llamar `sts:AssumeRole`. La cuenta destino debe confiar en ese principal y, cuando corresponda, exigir el mismo `ExternalId` guardado en la conexion.

La validacion de una conexion AWS usa STS y registra el resultado de la prueba. Para configurar el principal base y las policies, consultar:

- [Playbook de conexiones AWS](./operacion/aws/cloud-connections-playbook.md)
- [Hardening de AssumeRole](./operacion/aws/assumerole-hardening.md)

## Guardrail por cambio de cuenta

Si cambia la cuenta efectiva despues de un `APPLY` real, el backend bloquea nuevas ejecuciones reales contra el target distinto. El contexto anterior permanece disponible como evidencia historica del despliegue original.

## Auditoria

`PlanExecutionRecord` y el detalle del plan registran:

- usuario solicitante;
- accion `PLAN`, `APPLY` o `DESTROY`;
- modo preview o real;
- conexion, cuenta y ARN usados;
- uso de delegacion;
- estado, logs y outputs.
