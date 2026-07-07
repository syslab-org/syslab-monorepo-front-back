# Infra y Operacion

## 1. Desarrollo local real

Archivos principales:

- `Makefile`
- `tools/docker/compose.dev.yml`

Servicios confirmados en compose:

- `frontend`
- `backend`
- `celery`
- `flower`
- `postgres`
- `redis`

Caracteristicas observadas:

- `frontend` expuesto en `5173`
- `backend` expuesto en `8000`
- `flower` expuesto en `5555`
- Postgres local forzado por `DATABASE_URL=postgres://teg:teg@postgres:5432/teg`
- montaje de `~/.aws` dentro de `backend` y `celery`
- healthchecks para backend, celery, postgres y redis

## 2. Operacion via Makefile

El `Makefile` ya no solo tiene comandos basicos.

Runbooks efectivos identificados:

- desarrollo local,
- publicacion a ECR,
- infraestructura AWS auxiliar,
- smoke tests,
- tunnels para acceso publico o temporal,
- utilidades de migracion y debugging.

## 3. Infraestructura AWS definida

Carpeta principal: `infra/terraform/`

Recursos definidos por archivos:

- red base y seguridad,
- ECR,
- RDS,
- ElastiCache Redis,
- S3,
- Secrets,
- IAM para tareas y GitHub OIDC.

Bootstrap remoto separado:

- `infra/bootstrap/` crea el backend remoto de Terraform.

## 4. Estado real del despliegue AWS

Lo que se puede afirmar leyendo codigo:

- existe una infraestructura AWS auxiliar para base de datos, red, secretos, artefactos e imagenes,
- el `Makefile` contiene flujo de bootstrap remoto, gestion de state, ECR y chequeos locales,
- el backend contempla credenciales runtime y `AssumeRole`,
- la documentacion prudente debe seguir diciendo "arquitectura soportada" y no "entorno siempre activo".

## 5. Relacion entre infra de plataforma e infra de laboratorio

Hay dos usos distintos de Terraform:

- `infra/terraform/`: despliega la plataforma donde vive el sistema.
- `apps/backend/provisioning/templates/`: genera la infraestructura del laboratorio del usuario.

Esa diferencia aparece en codigo y conviene mantenerla explicitada porque varios documentos historicos la mezclan.

## 6. Estado local de Terraform para laboratorios

Archivo clave: `apps/backend/api/providers/aws/terraform.py`

Comportamiento actual:

- intenta usar `TF_STATE_ROOT`,
- si no existe, intenta usar `/tfstate`,
- si esa ruta no es escribible, cae a un directorio temporal del sistema.

Impacto practico:

- en `Docker Compose` local y servidor, no cambia el comportamiento esperado porque existe el volumen `tfstate:/tfstate`,
- en revision local fuera de contenedores, evita fallos por permisos al no depender rigidamente de `/tfstate`,
- en un despliegue AWS sin volumen persistente para ese estado local, el fallback permite ejecutar pero deja el state sujeto al filesystem efimero del contenedor.

Conclusion operativa:

- la ruta validada sigue siendo Compose con volumen persistente,
- si se quiere operar este flujo en otro runtime, conviene definir un `TF_STATE_ROOT` escribible y persistente.

## 7. Mejora futura documentada

Area: `apps/backend/api/providers/runtime_registry.py`, `apps/backend/api/providers/aws/runtime.py` y `apps/backend/api/providers/aws/executor.py`

Pendiente tecnico:

- hoy el backend todavia usa una deteccion de runtime AWS basada en variables de entorno del contenedor para decidir parte de la habilitacion de `apply` y `destroy` reales.
- esa logica no afecta el flujo validado actual, porque `compose.dev` y `compose.server` operan con `AWS_PROFILE`, `AWS_SDK_LOAD_CONFIG=1`, `~/.aws` montado y `ALLOW_LOCAL_APPLY=1`.
- si en el futuro se quisiera endurecer este criterio, la mejora recomendada es reemplazar esa deteccion por una comprobacion mas robusta basada en `STS`, de forma que la habilitacion dependa de credenciales realmente resolubles y no del tipo de runtime.

## 8. Verificaciones ejecutadas

- `pnpm build` en `apps/frontend/`: exitoso.
- `python apps/backend/manage.py test api.tests`: 56 tests OK.

## 9. Hallazgos importantes

- la guia de instalacion local esta razonablemente alineada con `compose.dev.yml`.
- la guia AWS quedo acotada a la infraestructura auxiliar que hoy si existe en Terraform.
- el README raiz ya fue reducido a una entrada corta y vigente.
