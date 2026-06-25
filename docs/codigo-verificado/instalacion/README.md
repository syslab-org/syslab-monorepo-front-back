# Instalacion del Proyecto

Esta seccion separa la instalacion por entorno para evitar mezclar pasos de desarrollo local, servidor Ubuntu y despliegue de plataforma en AWS.

## Que guia usar

- Si vas a desarrollar en tu maquina: [Instalacion en local](./local.md)
- Si vas a levantar la app en una ThinkPad o Ubuntu Server dentro de la LAN: [Servidor Ubuntu en LAN](./servidor-ubuntu/README.md)
- Si el mismo Ubuntu Server alojara varios proyectos: [Servidor Ubuntu con multiples proyectos](./servidor-ubuntu/multiples-proyectos.md)
- Si vas a usar `Cloud Connections` con `AssumeRole` en ese servidor: [AWS runtime y AssumeRole](./servidor-ubuntu/aws-runtime-assumerole.md)
- Si quieres publicar temporalmente ese servidor con Cloudflare: [Deploy LAN con Caddy](./servidor-ubuntu/deploy-lan-caddy.md)
- Si quieres repetir los escenarios validados de `Key Pairs`, `Allowed SSH CIDR` y acceso SSH real: [Playbook de Key Pairs y Acceso SSH en AWS](../operacion/aws/key-pairs-ssh-playbook.md)
- Si vas a preparar infraestructura auxiliar en AWS: [Infraestructura AWS auxiliar](./aws.md)

## Arquitectura por entorno

En `local` y `servidor Ubuntu` el stack se levanta con Docker Compose:

- `frontend`: Vite + React
- `backend`: Django + Gunicorn
- `celery`: worker de tareas
- `postgres`: base de datos del stack
- `redis`: broker y result backend de Celery
- `flower`: monitoreo de Celery en desarrollo
- `caddy`: solo en modo servidor Ubuntu, conectado a una red Docker compartida `edge`
- `reverse-proxy`: stack aparte en el host, fuera de este repo, que publica `:80` y `:443`

En `servidor Ubuntu` hay una regla importante para AWS:

- `AWS_PROFILE` del backend define la identidad base real del runtime
- una `Cloud Connection` en modo `AssumeRole` no reemplaza esa identidad base; la usa para asumir el role configurado

En `AWS`, `infra/terraform/` hoy define una capa de infraestructura auxiliar:

- VPC y subnets
- RDS PostgreSQL
- ElastiCache Redis
- ECR para imagenes Docker
- S3 para planes
- Secrets Manager para `DATABASE_URL`

Esta capa de infraestructura existe en el repositorio como opcion de despliegue administrado en AWS. Sin embargo, la ruta operativa validada del proyecto sigue siendo Docker Compose en `local` y `servidor Ubuntu`, por lo que conviene verificar el estado real del entorno AWS antes de asumir que dichos recursos se encuentran activos.

## Requisitos comunes

- `git`
- `make`
- `docker`
- `docker compose` plugin

Versiones recomendadas:

- Docker Engine reciente con Compose v2
- Node `20` si alguna vez ejecutas frontend fuera de contenedores
- Python `3.11` si alguna vez ejecutas backend fuera de contenedores

## Requisitos extra para AWS

- `aws` CLI v2
- `terraform >= 1.6`
- `jq`
- `curl`
## Politica recomendada para archivos `.env`

- Los archivos `*.example` si pueden vivir en git porque solo traen valores de ejemplo.
- Los archivos reales de entorno deben existir solo en cada maquina.
- Nunca guardes llaves AWS, tokens ni secretos reales en archivos versionados.

Estado recomendado:

- `.env.example`: plantilla versionada
- `.env`: archivo real local
- `.env.dev.example`: plantilla versionada
- `.env.dev`: archivo real local
- `.env.server.example`: plantilla versionada
- `.env.server`: archivo real solo del servidor
- `.env.public.example`: plantilla versionada
- `.env.public`: archivo real solo si usas Cloudflare Tunnel

## Variables clave

- `SECRET_KEY`: clave privada de Django. Debe ser distinta por entorno.
- `DEBUG`: `true` en local, `false` en servidor.
- `ALLOWED_HOSTS`: IPs o dominios reales por donde entran peticiones.
- `CSRF_TRUSTED_ORIGINS`: mismos accesos, pero con esquema completo.
- `AWS_PROFILE`: nombre del perfil configurado con `aws configure --profile <nombre>`.
- `AWS_DEFAULT_REGION`: region objetivo del proyecto. En este repo, `us-east-1`.
- `AWS_SDK_LOAD_CONFIG=1`: hace que boto3 lea `~/.aws/config` y `~/.aws/credentials`.
- `ALLOW_LOCAL_APPLY=1`: permite `terraform apply` y `destroy` fuera del runtime con rol administrado.
- `KEEP_TF_DIRS=1`: conserva directorios temporales de Terraform para depuracion.

## Dónde viven las credenciales AWS

No deben vivir en `.env`.

Deben vivir en:

- `~/.aws/credentials`
- `~/.aws/config`

Ejemplo:

```ini
[tesis]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY
```

```ini
[profile tesis]
region = us-east-1
output = json
```

## Medidas de seguridad recomendadas

- usa `AWS_PROFILE` en vez de `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` en `.env`
- limita permisos de archivo en secretos locales: `chmod 600 .env .env.dev .env.server .env.public ~/.aws/credentials ~/.aws/config`
- no reutilices la misma `SECRET_KEY` entre local, servidor y otros ambientes
- en servidor, evita `DEBUG=true`
- cuando migres a HTTPS real, cambia `SESSION_COOKIE_SECURE=1` y `CSRF_COOKIE_SECURE=1`
- rota cualquier credencial AWS que alguna vez haya quedado escrita en un archivo compartido
