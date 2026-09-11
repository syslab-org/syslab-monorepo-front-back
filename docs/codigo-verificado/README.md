# Codigo Verificado

Esta carpeta concentra la documentacion explicativa del codigo que hoy si esta alineada con el repositorio.

Objetivo:

- reunir en un solo lugar la explicacion tecnica del sistema,
- documentar solamente comportamiento respaldado por la implementacion actual,
- mantener separadas las guias conceptuales de los procedimientos operativos.

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
- `arquitectura/`: flujo tecnico vigente y assets de arquitectura.
- `producto/`: guion de demo, casos de uso y graficas funcionales.

## Verificacion rapida realizada

- `pnpm build` en `apps/frontend/`: exitoso.
- `python apps/backend/manage.py test api.tests` en `apps/backend/`: 57 tests OK.

## Alcance

Esta carpeta es el punto de entrada para entender, instalar y operar el codigo vigente. Las capacidades futuras se identifican solo cuando resulta necesario aclarar que no estan disponibles.
