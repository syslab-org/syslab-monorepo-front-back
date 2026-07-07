# Codigo Verificado

Esta carpeta concentra la documentacion explicativa del codigo que hoy si esta alineada con el repositorio.

Objetivo:

- reunir en un solo lugar la explicacion tecnica del sistema,
- separar lo verificado en codigo de lo historico o academico,
- dejar explicitadas las brechas entre documentacion y realidad implementada.

## Como leer esta carpeta

- `01-resumen-verificado.md`: vista general del sistema y su estado real.
- `02-frontend.md`: rutas, modulos y comportamiento efectivo del frontend.
- `03-backend.md`: modelos, permisos, API y ejecucion asincrona.
- `04-infra-operacion.md`: Docker, Makefile, Terraform y despliegue.
- `05-cloud-execution-model.md`: modelo vigente de ejecucion cloud y reglas de despliegue real.
- `06-permissions-matrix.md`: matriz vigente de permisos por rol y tipo de conexion.

Subcarpetas activas:

- `instalacion/`: guias por entorno.
- `operacion/`: playbooks y matrices operativas.
- `arquitectura/`: flujo tecnico detallado y assets de arquitectura.
- `producto/`: casos de uso y graficas funcionales.

## Criterio usado

- `Verificado en codigo`: confirmado leyendo implementacion actual.
- `Verificado por ejecucion`: confirmado corriendo build o comandos locales.
- `Parcial`: la idea general sigue vigente, pero el detalle ya no coincide del todo.
- `Legacy o desactualizado`: conserva valor historico, pero no debe usarse como fuente canonica del codigo actual.

## Verificacion rapida realizada

- `pnpm build` en `apps/frontend/`: exitoso.
- `python apps/backend/manage.py test api.tests` en `apps/backend/`: 56 tests OK.

## Alcance

Esta carpeta no reemplaza las guias de instalacion u operacion. Se vuelve el punto de entrada recomendado para entender el codigo vigente.
