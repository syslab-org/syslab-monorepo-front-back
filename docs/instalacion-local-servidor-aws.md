# Guia de instalacion: local, servidor y AWS

Esta guia deja un camino unico para instalar y operar el proyecto en tres escenarios:

- desarrollo local en una maquina personal
- servidor Linux/LAN como la ThinkPad
- despliegue de la plataforma en AWS con Terraform + ECR + ECS + RDS + Redis

La ruta recomendada es siempre `Docker + Makefile`. Eso evita depender de instalaciones manuales de Python, Node o Terraform dentro de la app.

## 1. Arquitectura que vas a instalar

En local y servidor el stack se levanta con Docker Compose:

- `frontend`: Vite + React
- `backend`: Django + Gunicorn
- `celery`: worker de tareas
- `postgres`: base de datos local del stack
- `redis`: broker/result backend de Celery
- `flower`: monitoreo de Celery en desarrollo
- `caddy`: solo en modo servidor/publico
- `cloudflared`: opcional para publicar el servidor

En AWS, `infra/terraform/` despliega la plataforma de ejecucion:

- VPC y subnets
- ALB
- ECS/Fargate para `backend` y `celery`
- RDS PostgreSQL
- ElastiCache Redis
- ECR para imagenes Docker
- S3 para planes
- Secrets Manager para `DATABASE_URL`

## 2. Requisitos previos

### Requisitos comunes

- `git`
- `make`
- `docker`
- `docker compose` plugin

Versiones recomendadas segun el repo:

- Docker Engine reciente con Compose v2
- Node `20` si alguna vez ejecutas frontend fuera de contenedores
- Python `3.11` si alguna vez ejecutas backend fuera de contenedores

### Requisitos extra para despliegue AWS

- `aws` CLI v2
- `terraform` `>= 1.6`
- `jq`
- `curl`
- `session-manager-plugin`

`session-manager-plugin` es necesario porque `make aws-migrate` usa `aws ecs execute-command`.

### Requisitos de permisos AWS

El perfil AWS que uses debe poder trabajar al menos con estos servicios:

- `STS`
- `S3`
- `DynamoDB`
- `ECR`
- `ECS`
- `EC2`, `ELBv2`, `IAM`
- `RDS`
- `ElastiCache`
- `Secrets Manager`
- `CloudWatch Logs`
- `Service Quotas` para preflight de Transit Gateway

## 3. Archivos de configuracion que debes preparar

## 3.1 Politica recomendada para archivos `.env`

Para evitar ambiguedades, usa esta regla:

- los archivos `*.example` si pueden vivir en git porque solo traen valores de ejemplo
- los archivos reales de entorno deben existir solo en cada maquina
- nunca guardes llaves AWS, tokens ni secretos reales en archivos versionados

Estado recomendado por archivo:

- `.env.example`: plantilla versionada
- `.env`: archivo real local de la maquina
- `.env.dev.example`: plantilla versionada
- `.env.dev`: archivo real local de la maquina
- `.env.server.example`: plantilla versionada
- `.env.server`: archivo real solo del servidor
- `.env.public.example`: plantilla versionada
- `.env.public`: archivo real solo si usas Cloudflare Tunnel

Importante:

- hoy el repo todavia trae un `.env` legacy con valores de desarrollo para compatibilidad
- desde ahora la practica recomendada es usar `.env.example` como plantilla y tratar `.env` como archivo local
- `.env.dev`, `.env.server` y `.env.public` ya deben quedar fuera de git

## 3.2 De donde sale cada valor importante

### Variables base de Django

- `SECRET_KEY`: la clave privada de Django para firmar sesiones, tokens y protecciones internas. Debe generarse por maquina o por entorno. No debe copiarse desde un chat ni compartirse por correo.
- `DEBUG`: `1` o `true` en desarrollo local; `false` en servidor.
- `ALLOWED_HOSTS`: la lista de hostnames o IPs por donde entraran peticiones reales al backend.
- `CSRF_TRUSTED_ORIGINS`: la lista de origenes completos con esquema, por ejemplo `http://192.168.1.149`.
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE`: `0` si el servidor solo usa HTTP en LAN; `1` cuando hay HTTPS real.

### Variables AWS

- `AWS_PROFILE`: el nombre del perfil configurado en el host con `aws configure --profile <nombre>`. En esta guia usamos `tesis` como nombre sugerido, pero puede ser otro si lo reflejas de forma consistente.
- `AWS_DEFAULT_REGION`: la region AWS donde operara el proyecto. En este repo el valor esperado por defecto es `us-east-1`.
- `AWS_SDK_LOAD_CONFIG=1`: obliga a boto3 y AWS SDK a leer `~/.aws/config` y `~/.aws/credentials`.
- `ALLOW_LOCAL_APPLY=1`: permite que el backend ejecute `terraform apply` o `destroy` desde un entorno no ECS. En una maquina que solo desarrollara UI o backend sin tocar AWS, puedes dejarlo en `0`.
- `KEEP_TF_DIRS=1`: conserva directorios temporales de Terraform para depuracion.

### Donde viven las credenciales AWS

No deben vivir en `.env`.

Deben vivir en los archivos del usuario del sistema:

- `~/.aws/credentials`
- `~/.aws/config`

Ejemplo conceptual:

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

En servidor, si el usuario que ejecuta Docker es `ubuntu`, esas rutas serian:

- `/home/ubuntu/.aws/credentials`
- `/home/ubuntu/.aws/config`

## 3.3 Medidas de seguridad recomendadas

- usa `AWS_PROFILE` en vez de poner `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` dentro de `.env`
- limita permisos de archivo en secretos locales: `chmod 600 .env .env.dev .env.server .env.public ~/.aws/credentials ~/.aws/config`
- usa un usuario del sistema dedicado para operar el servidor si es posible
- no reutilices la misma `SECRET_KEY` entre local, servidor y otros ambientes
- en servidor, evita `DEBUG=true`
- cuando migres a HTTPS real, cambia `SESSION_COOKIE_SECURE=1` y `CSRF_COOKIE_SECURE=1`
- rota cualquier credencial AWS que alguna vez haya quedado escrita en un archivo versionado o compartido
- si el equipo crece, prioriza credenciales temporales o `AssumeRole` antes que llaves largas permanentes

### Base local

- `.env`
- `.env.dev`

Para una instalacion nueva, crea ambos archivos locales desde las plantillas:

```bash
cp .env.example .env
cp .env.dev.example .env.dev
```

Regla importante:

- usa `AWS_PROFILE` + `~/.aws`
- no guardes claves AWS permanentes dentro de `.env.dev`

### Servidor LAN

- `.env.server`

Crealo desde:

```bash
cp .env.server.example .env.server
```

### AWS/Terraform

- `infra/bootstrap/terraform.tfvars`
- `infra/terraform/dev.auto.tfvars`

Crea ambos desde los ejemplos:

```bash
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
cp infra/terraform/dev.auto.tfvars.example infra/terraform/dev.auto.tfvars
```

## 4. Instalacion en una maquina local

### Paso 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd syslab-monorepo-front-back
```

### Paso 2. Preparar variables locales

```bash
cp .env.example .env
cp .env.dev.example .env.dev
chmod 600 .env .env.dev
```

Ahora edita cada archivo.

#### Archivo `.env`

Este archivo contiene configuracion base de Django para tu maquina local.

Valores recomendados:

```env
REDIS_URL=redis://redis:6379/0
DEBUG=1
SECRET_KEY=tu-clave-local-unica
ALLOWED_HOSTS=*
ALLOW_LOCAL_APPLY=1
```

De donde sale `SECRET_KEY`:

- no viene de AWS
- no viene del sistema operativo
- la generas tu para este entorno

Puedes generarla asi:

```bash
python3 - <<'PY'
from secrets import token_urlsafe
print(token_urlsafe(50))
PY
```

Ejemplo de salida:

```text
lE3sc-TqXMlcjdBm7dd6XwwmBdoWJFJUcwB4Q4tImV-OT4Bxzz6lGlnMROFk3BQ8XSY
```

#### Archivo `.env.dev`

Este archivo agrega solo lo necesario para desarrollo con opcion de deploy real a AWS.

Valores recomendados:

```env
AWS_PROFILE=tesis
AWS_DEFAULT_REGION=us-east-1
AWS_SDK_LOAD_CONFIG=1
ALLOW_LOCAL_APPLY=1
KEEP_TF_DIRS=1
```

De donde sale cada valor:

- `AWS_PROFILE=tesis`: es el nombre del perfil que tu mismo crearas en `~/.aws/credentials`
- `AWS_DEFAULT_REGION=us-east-1`: sale de la region objetivo definida por el proyecto
- `AWS_SDK_LOAD_CONFIG=1`: lo exige el flujo basado en perfil local
- `ALLOW_LOCAL_APPLY=1`: solo si quieres permitir deploy AWS real desde tu laptop

Si en tu maquina no haras despliegues reales a AWS, puedes dejar:

```env
ALLOW_LOCAL_APPLY=0
```

Si vas a ejecutar `apply` real desde local, configura tambien el perfil AWS en el host:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
```

Eso creara o actualizara:

- `~/.aws/credentials`
- `~/.aws/config`

Si prefieres otro nombre de perfil, por ejemplo `empresa-dev`, entonces cambia ambos lados:

- `aws configure --profile empresa-dev`
- `AWS_PROFILE=empresa-dev` en `.env.dev`

### Paso 3. Levantar el stack

```bash
make up
```

Esto levanta:

- frontend en `http://localhost:5173`
- backend en `http://localhost:8000`
- flower en `http://localhost:5555`
- postgres y redis dentro del mismo stack

### Paso 4. Aplicar migraciones

El contenedor backend ya intenta correr migraciones al iniciar, pero conviene dejar este paso explicito:

```bash
make migrate
```

### Paso 5. Verificar que todo quedo bien

```bash
curl http://localhost:8000/healthz/
make ps
PLAN_FILE=case-01-single-vpc.json make smoke-local
```

### Paso 6. Operacion diaria

```bash
make logs
make stop
make start
make down
```

## 5. Instalacion en un servidor Linux o ThinkPad

Este flujo sirve para un Ubuntu Server en LAN y usa `tools/docker/compose.server.yml`.

### Paso 1. Instalar dependencias del host

En Ubuntu:

```bash
sudo apt update
sudo apt install -y git make curl jq awscli
```

Instala Docker Engine y Docker Compose plugin segun el metodo oficial de Docker para Ubuntu.

Si luego usaras `aws ecs execute-command`, instala tambien `session-manager-plugin`.

### Paso 2. Clonar el repo en el servidor

Ejemplo:

```bash
sudo mkdir -p /opt/syslab
sudo chown "$USER":"$USER" /opt/syslab
cd /opt/syslab
git clone <URL_DEL_REPO> syslab-monorepo-front-back
cd syslab-monorepo-front-back
```

### Paso 3. Preparar `.env.server`

```bash
cp .env.server.example .env.server
chmod 600 .env.server
```

Ajusta como minimo:

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `AWS_PROFILE`
- `AWS_DEFAULT_REGION`

Ejemplo para un servidor LAN con IP `192.168.1.149`:

```env
DEBUG=false
SECRET_KEY=reemplaza-esta-clave
ALLOWED_HOSTS=192.168.1.149,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://192.168.1.149,http://localhost
SESSION_COOKIE_SECURE=0
CSRF_COOKIE_SECURE=0
AWS_PROFILE=tesis
AWS_DEFAULT_REGION=us-east-1
```

De donde sale cada valor:

- `SECRET_KEY`: debes generarla especificamente para ese servidor; no reutilices la de tu laptop
- `ALLOWED_HOSTS`: sale de la IP o dominio real por el que vas a abrir el sistema
- `CSRF_TRUSTED_ORIGINS`: sale de esos mismos accesos, pero con esquema completo `http://` o `https://`
- `AWS_PROFILE`: es el perfil AWS configurado en el usuario del host que ejecuta Docker
- `AWS_DEFAULT_REGION`: la region donde correra el despliegue AWS

Si el servidor solo sera de demostracion en LAN y no ejecutara Terraform real, puedes igualmente dejar el perfil AWS sin configurar y mantener el uso solo web. Pero si el servidor lanzara laboratorios reales en AWS, entonces si debes configurar `~/.aws`.

### Paso 4. Configurar AWS en el host

Solo hace falta si desde ese servidor vas a permitir deploy real de laboratorios AWS:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
chmod 600 ~/.aws/credentials ~/.aws/config
```

Si el servidor usa otro usuario operativo, ejecuta estos comandos con ese mismo usuario.

### Paso 5. Levantar el stack del servidor

```bash
make server-up
```

Esto deja:

- `frontend`, `backend`, `celery`, `postgres`, `redis`
- `caddy` exponiendo la app en `:80`
- puertos internos cerrados hacia afuera

### Paso 6. Verificar

```bash
make server-ps
curl http://localhost/healthz/
curl http://<IP_DEL_SERVIDOR>/healthz/
```

Abre luego en navegador:

```text
http://<IP_DEL_SERVIDOR>/
```

### Paso 7. Firewall recomendado

Para acceso LAN simple:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

No hace falta abrir `5173`, `8000`, `5432`, `6379` ni `5555`.

### Paso 8. Publicacion opcional con Cloudflare Tunnel

Quick Tunnel:

```bash
make server-quick-tunnel-up
make server-quick-tunnel-logs
```

Tunnel estable:

```bash
cp .env.public.example .env.public
```

Completa `CLOUDFLARE_TUNNEL_TOKEN` en `.env.public`. Como `docker compose` no carga ese archivo automaticamente en este flujo, exportalo antes de levantar el tunnel:

```bash
set -a
source .env.public
set +a
make server-tunnel-up
make server-tunnel-logs
```

### Paso 9. Operacion del servidor

```bash
make server-logs
make server-restart
make server-down
```

## 6. Instalacion y despliegue de la plataforma en AWS

Este flujo despliega la plataforma del proyecto en AWS. No despliega solo una VM: despliega ECR, ECS, ALB, RDS, Redis y demas piezas del entorno.

## 6.1 Suposiciones de esta guia

Esta guia usa los nombres actuales del repo, porque `infra/terraform/backend.tf` esta fijado al state remoto:

- bucket S3: `tesis-dev-tfstate`
- tabla DynamoDB: `tesis-dev-tf-locks`
- region: `us-east-1`
- project: `tesis`
- env: `dev`

Si cambias esos nombres, tambien debes ajustar `infra/terraform/backend.tf`.

## 6.2 Configurar credenciales AWS

En la maquina desde donde haras Terraform:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
```

Exporta defaults si quieres evitar repetirlos:

```bash
export AWS_PROFILE=tesis
export AWS_REGION=us-east-1
```

## 6.3 Bootstrap del backend remoto de Terraform

Primero crea S3 y DynamoDB para el state remoto:

```bash
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
cd infra/bootstrap
terraform init
terraform apply
cd ../..
```

Con los valores por defecto del ejemplo, esto crea:

- bucket `tesis-dev-tfstate`
- tabla `tesis-dev-tf-locks`

## 6.4 Preparar variables del stack AWS

```bash
cp infra/terraform/dev.auto.tfvars.example infra/terraform/dev.auto.tfvars
```

Minimo recomendado en `infra/terraform/dev.auto.tfvars`:

- `aws_profile`
- `region`
- `secret_key`
- `django_debug=false`
- `allowed_hosts`
- `cors_allowed_origins`
- `csrf_trusted_origins`

Si usaras HTTPS en el ALB, agrega:

- `acm_certificate_arn`

Si no defines `acm_certificate_arn`, el ALB quedara solo por HTTP.

## 6.5 Inicializar Terraform del entorno principal

```bash
terraform -chdir=infra/terraform init -reconfigure
```

## 6.6 Construir las imagenes Docker locales

`make aws-bootstrap` necesita que las imagenes locales ya existan para poder hacer push a ECR:

```bash
make build
```

## 6.7 Desplegar todo en AWS

```bash
make aws-bootstrap AWS_PROFILE=tesis AWS_REGION=us-east-1 TAG=dev-latest
```

Ese comando hace este flujo:

1. crea la infra base del stack principal con `backend=0` y `celery=0`
2. construye y publica imagenes en ECR
3. aplica Terraform con replicas activas
4. espera a que ECS quede estable
5. ejecuta migraciones Django dentro del servicio ECS
6. espera `healthz` del ALB

## 6.8 Verificar el despliegue AWS

```bash
make tf-outputs AWS_PROFILE=tesis AWS_REGION=us-east-1
make echo-backend-url AWS_PROFILE=tesis AWS_REGION=us-east-1
PLAN_FILE=case-01-single-vpc.json make smoke AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Checks utiles:

- `backend_url`
- `alb_dns_name`
- `plans_bucket`
- `redis_endpoint`
- `rds_endpoint`

## 6.9 Operacion normal en AWS

Levantar o reanudar servicios:

```bash
make aws-up-safe AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Redeploy despues de cambios en backend o celery:

```bash
make build
make aws-redeploy-safe AWS_PROFILE=tesis AWS_REGION=us-east-1 TAG=dev-latest
```

Apagar tareas sin destruir infraestructura:

```bash
make aws-stop AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Destruir la infraestructura del stack principal:

```bash
make aws-down AWS_PROFILE=tesis AWS_REGION=us-east-1
```

Ver estado:

```bash
make aws-status AWS_PROFILE=tesis AWS_REGION=us-east-1
```

## 6.10 Consideraciones de costo y seguridad

- `aws-down` destruye el stack principal, pero el backend remoto de Terraform en S3 y DynamoDB sigue existiendo
- `RDS`, `ALB`, `Redis` y tareas ECS generan costo mientras estan activos
- usa `make aws-stop` cuando quieras bajar costo sin destruir todo
- para un entorno serio, cambia `secret_key`, desactiva `django_debug` y define `allowed_hosts`, `cors_allowed_origins` y `csrf_trusted_origins` explicitos
- no guardes llaves AWS en archivos versionados

## 7. Checklist rapido por escenario

### Local

```bash
cp .env.dev.example .env.dev
make up
make migrate
PLAN_FILE=case-01-single-vpc.json make smoke-local
```

### Servidor LAN

```bash
cp .env.server.example .env.server
make server-up
curl http://localhost/healthz/
```

### AWS plataforma

```bash
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
cp infra/terraform/dev.auto.tfvars.example infra/terraform/dev.auto.tfvars
cd infra/bootstrap && terraform init && terraform apply && cd ../..
terraform -chdir=infra/terraform init -reconfigure
make build
make aws-bootstrap AWS_PROFILE=tesis AWS_REGION=us-east-1 TAG=dev-latest
```

## 8. Problemas frecuentes

### `docker compose` no encuentra `.env.dev`

Crea el archivo:

```bash
cp .env.dev.example .env.dev
```

### `terraform init -reconfigure` falla en `infra/terraform`

Normalmente significa que aun no corriste el bootstrap de `infra/bootstrap` o que el perfil/region no coinciden con el backend S3/DynamoDB esperado.

### `make aws-migrate` falla

Revisa:

- que `session-manager-plugin` este instalado en tu maquina
- que ECS Exec este permitido
- que el servicio backend tenga al menos una task `RUNNING`

### El servidor LAN abre, pero login o formularios fallan por CSRF

Revisa que `.env.server` tenga bien:

- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- la IP o dominio reales del servidor

### El deploy real desde local no aplica infraestructura AWS

Revisa:

- `ALLOW_LOCAL_APPLY=1`
- `AWS_PROFILE`
- `AWS_SDK_LOAD_CONFIG=1`
- que `aws sts get-caller-identity --profile tesis` funcione en el host
