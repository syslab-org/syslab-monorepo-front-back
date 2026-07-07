# Resumen Verificado

## 1. Que es el sistema hoy

El repositorio implementa un monorepo para una plataforma educativa de laboratorios de red cloud.

Flujo real actual:

1. un usuario autenticado entra al dashboard web,
2. crea un `Lab`,
3. modela su topologia en el canvas,
4. el frontend sincroniza esa intencion a un `Plan`,
5. el backend valida y compila el payload por provider,
6. Celery ejecuta `plan`, `apply` o `destroy`,
7. la UI consulta estado, logs, outputs e historial.

## 2. Estructura real del repo

- `apps/frontend/`: SPA React + Vite.
- `apps/backend/`: API Django REST + Celery.
- `infra/bootstrap/`: bootstrap de Terraform para backend remoto.
- `infra/terraform/`: infraestructura AWS de la plataforma.
- `tools/docker/`: Dockerfiles y compose.
- `docs/`: mezcla de documentacion tecnica, operativa, de producto y tesis.
- `scripts/`: utilitarios operativos y de soporte.

## 3. Estado funcional confirmado

- Frontend: compila correctamente con `pnpm build`.
- Backend: la API, modelos y tasks estan implementados, pero en este shell no fue posible correr tests por faltar dependencias Python instaladas localmente.
- Runtime cloud real: `AWS` es el unico provider con soporte ejecutable completo.
- `GCP` y `Azure`: aparecen en frontend, adapters y registries, pero su estado operativo sigue siendo `planned`.

## 4. Superficies activas del producto

- autenticacion por email y Google,
- onboarding por invitacion,
- gestion de usuarios, cursos y conexiones cloud,
- listado y edicion de laboratorios,
- canvas de topologias con formularios por provider,
- sincronizacion `Lab -> Plan`,
- ejecuciones asincronas `plan/apply/destroy`,
- historial de ejecuciones y auto-destroy por curso,
- catalogos de AMIs y key pairs.

## 5. Realidad multi-cloud

El sistema ya no es AWS-only en estructura, pero si en operacion real.

- `AWS`: adapter, executor, runtime hooks y `CloudConnection` reales.
- `GCP`: UI y backend preparados para expansion, sin ejecucion real.
- `Azure`: UI y backend preparados para expansion, sin ejecucion real.

## 6. Legacy que sigue vivo

Persisten rutas y aliases de compatibilidad:

- `legacy_canvas_id` en `Lab`,
- `firestore_vpc_id` y `vpcId` como aliases de `canvas_id`,
- ruta frontend legacy `/admin/vpcs/:vpcid/mainflow`,
- endpoint legacy `sync_from_canvas` ademas de `sync-from-canvas`.

## 7. Recomendacion de lectura canonica

Para entender el codigo actual, usar esta carpeta antes que:

- `apps/frontend/README.md`,
- documentos historicos ya retirados del repo,
- diagramas o notas antiguas que describian rutas o estados superados.
