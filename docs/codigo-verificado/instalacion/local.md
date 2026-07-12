# Instalacion en Local

Esta guia sirve para levantar el proyecto en tu maquina personal usando `Docker + Makefile`.

Tambien deja documentado como configurar credenciales AWS cuando el backend local necesita probar o ejecutar `Cloud Connections` con `AWS AssumeRole`.

Regla corta:

- `.env` = base comun del entorno local
- `.env.dev` = overrides de desarrollo local
- en `compose.dev.yml`, `backend` y `celery` cargan primero `.env` y luego `.env.dev`
- por lo tanto, en dev, si una variable existe en ambos, gana `.env.dev`

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
ALLOW_LOCAL_APPLY=1
KEEP_TF_DIRS=1
```

Si en tu maquina no haras despliegues reales a AWS, puedes dejar:

```env
ALLOW_LOCAL_APPLY=0
```

Notas importantes:

- ya no hace falta exportar `AWS_PROFILE` en tu shell para que llegue al contenedor
- en dev, la fuente de verdad de `AWS_PROFILE` y `AWS_DEFAULT_REGION` debe ser `.env.dev`
- `compose.dev.yml` fija `AWS_SDK_LOAD_CONFIG=1` dentro del contenedor
- si cambias `.env` o `.env.dev`, recrea `backend` y `celery`
- si quieres inspeccionar el valor efectivo que recibira Docker, puedes usar `docker compose -f tools/docker/compose.dev.yml config`

## 3. Cómo se combinan `.env` y `.env.dev`

En este proyecto, `compose.dev.yml` carga los archivos en este orden:

1. `.env`
2. `.env.dev`

Entonces, en modo local:

- `.env` define la base del stack
- `.env.dev` sirve para sobreescribir valores del entorno dev

Ejemplo:

`.env`

```env
ALLOW_LOCAL_APPLY=1
AWS_PROFILE=tesis
```

`.env.dev`

```env
AWS_PROFILE=syslab-backend-assumer
KEEP_TF_DIRS=1
```

Resultado dentro de `backend`:

- `ALLOW_LOCAL_APPLY=1`
- `AWS_PROFILE=syslab-backend-assumer`
- `KEEP_TF_DIRS=1`

Eso deja una regla mucho mas simple:

- si quieres cambiar el perfil AWS del dev local, edita `.env.dev`
- si quieres cambiar una base comun del stack local, edita `.env`

## 4. Qué credencial usa realmente el backend local

En local hay tres capas que se suelen mezclar:

1. perfiles en `~/.aws/credentials`
2. perfiles en `~/.aws/config`
3. la variable `AWS_PROFILE` del contenedor backend

La regla efectiva es:

- el backend local usa el perfil indicado por `AWS_PROFILE`
- si `AWS_PROFILE` no existe, boto3 puede caer al perfil `default`
- la `Cloud Connection` en modo `AssumeRole` no reemplaza esa identidad base; la usa para llamar `sts:AssumeRole`

Ejemplo:

- en `~/.aws/credentials` puedes tener perfiles `default`, `tesis`, `syslab-backend-assumer`
- si `.env.dev` define `AWS_PROFILE=tesis`, el backend local intentara autenticarse como `tesis`
- si `.env.dev` define `AWS_PROFILE=syslab-backend-assumer`, el backend local intentara autenticarse como ese perfil

## 5. Cuándo hace falta `AWS_PROFILE`

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

## 6. Configurar AWS en el host

Primero define que perfil quieres usar en local.

Opciones tipicas:

- `tesis`: perfil humano para desarrollo local
- `syslab-backend-assumer`: perfil tecnico dedicado, alineado con servidor

Si quieres que local y servidor se comporten igual, conviene usar el mismo perfil tecnico:

```env
AWS_PROFILE=syslab-backend-assumer
```

### 6.1 Crear o actualizar el perfil

Con AWS CLI:

```bash
aws configure --profile tesis
```

O editando manualmente:

`~/.aws/credentials`

```ini
[tesis]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY
```

`~/.aws/config`

```ini
[profile tesis]
region = us-east-1
output = json
```

Si usas el perfil tecnico:

`~/.aws/credentials`

```ini
[syslab-backend-assumer]
aws_access_key_id = TU_ACCESS_KEY
aws_secret_access_key = TU_SECRET_KEY
```

`~/.aws/config`

```ini
[profile syslab-backend-assumer]
region = us-east-1
output = json
```

### 6.2 Verificar el perfil fuera de Docker

Esto debe funcionar antes de probar nada en SysLab:

```bash
aws sts get-caller-identity --profile tesis
```

O si usas el perfil tecnico:

```bash
aws sts get-caller-identity --profile syslab-backend-assumer
```

Si esto falla con `InvalidClientTokenId`, el problema no es Django ni Docker:

- la access key fue borrada o desactivada
- el secret no corresponde a esa key
- el perfil esta apuntando a credenciales rotadas o invalidas

Debes corregir `~/.aws/credentials` antes de seguir.

### 6.3 Verificar que el contenedor backend usa el perfil correcto

Una vez corregido el perfil en el host:

```bash
docker compose -f tools/docker/compose.dev.yml exec backend \
python manage.py shell -c "
import boto3, os
print('AWS_PROFILE=', os.getenv('AWS_PROFILE'))
print('AWS_DEFAULT_REGION=', os.getenv('AWS_DEFAULT_REGION'))
print(boto3.Session().client('sts').get_caller_identity())
"
```

Lo esperado es ver el mismo `Arn` que validaste con `aws sts get-caller-identity`.

Si cambiaste `.env.dev` recien antes de esta prueba, recrea los servicios:

```bash
docker compose -f tools/docker/compose.dev.yml up -d --force-recreate backend celery
```

Si quieres comprobar que Docker esta resolviendo el valor correcto antes de entrar al contenedor:

```bash
docker compose -f tools/docker/compose.dev.yml config | rg 'AWS_PROFILE|AWS_DEFAULT_REGION|ALLOW_LOCAL_APPLY|KEEP_TF_DIRS'
```

### 6.4 Verificar una `Cloud Connection` real con `AssumeRole`

Si ya existe una conexion como `Redes-1`:

```bash
docker compose -f tools/docker/compose.dev.yml exec backend \
python manage.py shell -c "
from api.models import CloudConnection
from api.cloud_connections import test_aws_connection
c = CloudConnection.objects.get(name='Redes-1')
print(test_aws_connection(c))
"
```

Lo esperado es algo como:

```python
(True, 'sts_ok', {...})
```

Si devuelve `InvalidClientTokenId`, el backend local sigue teniendo una identidad base invalida.

Si devuelve `AccessDenied`, entonces la credencial base ya funciona, pero:

- la trust policy del role no confia en ese principal
- o el `ExternalId` de la `Cloud Connection` no coincide

Eso crea o actualiza estos archivos en el host:

- `~/.aws/credentials`
- `~/.aws/config`

## 7. Levantar el stack

```bash
make up
```

Servicios expuestos:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- flower: `http://localhost:5555`

`postgres` y `redis` quedan dentro del mismo stack.

## 8. Aplicar migraciones

```bash
make migrate
```

## 9. Verificar el entorno

```bash
curl http://localhost:8000/healthz/
make ps
PLAN_FILE=case-01-single-vpc.json make smoke-local
```

## 10. Troubleshooting rapido de AWS en local

### Caso A. `aws sts get-caller-identity --profile ...` falla

Problema:

- el perfil local del host esta roto

Accion:

- rotar la access key en AWS
- actualizar `~/.aws/credentials`
- volver a probar fuera de Docker

### Caso B. el host funciona, pero el contenedor falla

Problema:

- `.env.dev` apunta a otro perfil
- el contenedor no tomo el cambio

Accion:

```bash
grep AWS_PROFILE .env.dev
docker compose -f tools/docker/compose.dev.yml down
docker compose -f tools/docker/compose.dev.yml up -d
```

### Caso C. el backend autentica, pero `test_aws_connection` falla con `AccessDenied`

Problema:

- el role destino no confia en el principal base
- o el `ExternalId` no coincide

Accion:

- revisar trust policy del role
- revisar `AWS Role ARN` y `External ID` en la `Cloud Connection`

## 11. Operacion diaria

```bash
make logs
make stop
make start
make down
```
