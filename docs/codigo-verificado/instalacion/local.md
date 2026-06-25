# Instalacion en Local

Esta guia sirve para levantar el proyecto en tu maquina personal usando `Docker + Makefile`.

## 1. Preparar el repositorio

```bash
git clone <URL_DEL_REPO>
cd syslab-monorepo-front-back
```

## 2. Preparar variables locales

```bash
cp .env.example .env
cp .env.dev.example .env.dev
chmod 600 .env .env.dev
```

Valores recomendados en `.env`:

```env
REDIS_URL=redis://redis:6379/0
DEBUG=1
SECRET_KEY=tu-clave-local-unica
ALLOWED_HOSTS=*
ALLOW_LOCAL_APPLY=1
```

Puedes generar `SECRET_KEY` asi:

```bash
python3 - <<'PY'
from secrets import token_urlsafe
print(token_urlsafe(50))
PY
```

Valores recomendados en `.env.dev`:

```env
AWS_PROFILE=tesis
AWS_DEFAULT_REGION=us-east-1
AWS_SDK_LOAD_CONFIG=1
ALLOW_LOCAL_APPLY=1
KEEP_TF_DIRS=1
```

Si en tu maquina no haras despliegues reales a AWS, puedes dejar:

```env
ALLOW_LOCAL_APPLY=0
```

## 3. Cuándo hace falta `AWS_PROFILE`

En local existen dos caminos posibles para ejecutar infraestructura AWS:

1. `Cloud Connection` con `AWS Static Keys`
2. `Cloud Connection` con `AWS AssumeRole`

Regla practica:

- si la conexion usa `AWS Static Keys`, el backend usa esas keys guardadas en la conexion
- si la conexion usa `AWS AssumeRole`, el backend necesita una identidad base en runtime para llamar `sts:AssumeRole`
- esa identidad base normalmente viene de `~/.aws` + `AWS_PROFILE`

Por eso, en local:

- `AWS_PROFILE` si es necesario cuando el laboratorio resuelve una conexion `AssumeRole`
- `AWS_PROFILE` no es estrictamente necesario si la conexion efectiva usa `Static Keys`
- si no hay `Cloud Connection` activa y quieres usar el modo runtime/legacy, tambien necesitas credenciales en el contenedor

Ejemplo de flujo `AssumeRole`:

1. `.env.dev` define `AWS_PROFILE=tesis`
2. `docker compose` monta `~/.aws` dentro de `backend` y `celery`
3. boto3 resuelve la identidad base del perfil `tesis`
4. SysLab usa esa identidad base para ejecutar `sts:AssumeRole`
5. el deploy real se hace con las credenciales temporales del role asumido

## 4. Configurar AWS en el host

Solo hace falta si ejecutarás `apply` real desde tu laptop:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
```

Eso crea o actualiza:

- `~/.aws/credentials`
- `~/.aws/config`

## 5. Levantar el stack

```bash
make up
```

Servicios expuestos:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- flower: `http://localhost:5555`

`postgres` y `redis` quedan dentro del mismo stack.

## 6. Aplicar migraciones

```bash
make migrate
```

## 7. Verificar el entorno

```bash
curl http://localhost:8000/healthz/
make ps
PLAN_FILE=case-01-single-vpc.json make smoke-local
```

## 8. Operacion diaria

```bash
make logs
make stop
make start
make down
```
