# SysLab Monorepo

Monorepo del sistema SysLab: una plataforma web para modelar laboratorios de red en un canvas, validarlos y ejecutar `plan`, `apply` y `destroy` sobre `AWS`.

## Stack real

- `apps/frontend/`: React + Vite + MUI + React Flow
- `apps/backend/`: Django REST + Celery
- `tools/docker/`: Dockerfiles y Compose
- `infra/`: bootstrap e infraestructura AWS con Terraform

## Estado actual

- provider ejecutable real: `AWS`
- providers planificados: `GCP`, `Azure`
- frontend verificado con `pnpm build`
- backend verificado con `python apps/backend/manage.py test api.tests`

## Documentacion recomendada

- [Indice general](./docs/README.md)
- [Sistema actual verificado](./docs/codigo-verificado/README.md)
- [Frontend](./docs/codigo-verificado/02-frontend.md)
- [Backend](./docs/codigo-verificado/03-backend.md)
- [Infra y operacion](./docs/codigo-verificado/04-infra-operacion.md)
- [Instalacion](./docs/codigo-verificado/instalacion/README.md)
- [Operacion AWS](./docs/codigo-verificado/operacion/README.md)

## Inicio rapido

```bash
make up
make migrate
```

Servicios locales esperados:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- flower: `http://localhost:5555`
