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

## 3. Configurar AWS en el host

Solo hace falta si ejecutarás `apply` real desde tu laptop:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
```

Eso crea o actualiza:

- `~/.aws/credentials`
- `~/.aws/config`

## 4. Levantar el stack

```bash
make up
```

Servicios expuestos:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- flower: `http://localhost:5555`

`postgres` y `redis` quedan dentro del mismo stack.

## 5. Aplicar migraciones

```bash
make migrate
```

## 6. Verificar el entorno

```bash
curl http://localhost:8000/healthz/
make ps
PLAN_FILE=case-01-single-vpc.json make smoke-local
```

## 7. Operacion diaria

```bash
make logs
make stop
make start
make down
```
