# AWS Runtime y AssumeRole

Esta guia aclara la parte que mas facilmente se presta a confusion en el servidor Ubuntu: que identidad AWS usa realmente el backend y como interactua eso con `Cloud Connections`.

Tambien documenta el flujo validado actual del proyecto, donde el principal base recomendado del backend es `syslab-backend-assumer`.

## Resumen corto

En el estado actual del proyecto hay dos capas distintas:

1. `AWS_PROFILE` del servidor Ubuntu
2. `Cloud Connection` configurada en la UI

Cuando la `Cloud Connection` usa `AWS Static Keys`:

- SysLab usa las keys guardadas en esa conexion
- no hace falta un `AWS_PROFILE` del contenedor para esa conexion en particular

Cuando la `Cloud Connection` usa `AWS AssumeRole`:

- SysLab no usa las static keys guardadas en esa fila como credencial base
- SysLab usa la identidad base del backend, tomada desde `~/.aws` y `AWS_PROFILE`
- con esa identidad base hace `sts:AssumeRole`

En otras palabras:

- `Static Keys` => la conexion ya trae la credencial efectiva
- `AssumeRole` => la conexion trae el role destino, pero el runtime debe aportar la credencial base

## Flujo real en servidor

1. El host Ubuntu tiene `~/.aws/credentials` y `~/.aws/config`
2. `compose.server.yml` monta `~/.aws` en el contenedor `backend`
3. el contenedor recibe `AWS_PROFILE` y `AWS_DEFAULT_REGION` desde `.env.server`
4. boto3 resuelve esa identidad base
5. si la `Cloud Connection` es `AssumeRole`, el backend llama `sts:AssumeRole` con:
   - `RoleArn`
   - `ExternalId` si existe
6. Terraform o la prueba usan las credenciales temporales del role asumido

## Dónde se define la identidad base

En el servidor:

- `~/.aws/credentials`
- `~/.aws/config`
- `.env.server`

Importante:

- en modo `server`, ya no dependes de exportar `AWS_PROFILE` en el shell para que llegue al contenedor
- el valor fuente debe quedar en `.env.server`
- si cambias `.env.server`, debes recrear el stack, no solo reiniciarlo
- esto es distinto al modo local, donde el override normal vive en `.env.dev`

Ejemplo recomendado:

```env
AWS_PROFILE=syslab-backend-assumer
AWS_DEFAULT_REGION=us-east-1
```

## Cómo verificar qué identidad usa el backend

Desde el servidor:

```bash
cd ~/apps/syslab-monorepo-front-back
docker compose -f tools/docker/compose.server.yml exec backend \
python manage.py shell -c "
import boto3, os
print('AWS_PROFILE=', os.getenv('AWS_PROFILE'))
print('AWS_DEFAULT_REGION=', os.getenv('AWS_DEFAULT_REGION'))
print(boto3.Session().client('sts').get_caller_identity())
"
```

Si ahí ves por ejemplo:

```text
arn:aws:iam::034739223309:user/syslab-backend-assumer
```

entonces esa es la identidad que debe poder asumir el role de la `Cloud Connection`.

## Qué debe existir para que AssumeRole funcione

### 1. La `Cloud Connection`

Debe tener:

- `Auth = AWS AssumeRole`
- `AWS Role ARN`
- `External ID` si la trust policy lo exige

### 2. El role destino

Debe confiar en la identidad base real del backend.

Ejemplo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::034739223309:user/syslab-backend-assumer"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "syslab-course-redes1"
        }
      }
    }
  ]
}
```

### 3. La identidad base del backend

Debe tener permiso para asumir ese role.

Ejemplo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::034739223309:role/syslab-course-redes1-role"
    }
  ]
}
```

## Caso validado durante la instalacion actual

En el servidor validado:

- `AWS_PROFILE=syslab-backend-assumer`
- el backend resolvio como caller:
  - `arn:aws:iam::034739223309:user/syslab-backend-assumer`

Por lo tanto:

- el role compartido del curso debe confiar en `syslab-backend-assumer`
- el backend debe conservar una access key valida para ese perfil en `~/.aws/credentials`
- si el role exige `sts:ExternalId`, la `Cloud Connection` debe guardar exactamente ese mismo valor

## Dos formas correctas de organizarlo

### Opcion A: usar el perfil real del servidor

Mantener:

```env
AWS_PROFILE=tesis
```

Y autorizar a esa identidad base a asumir los roles necesarios.

Ventaja:

- menos piezas para mantener

### Opcion B: crear un perfil dedicado para SysLab

Crear en `~/.aws` un perfil como:

```text
syslab-backend-assumer
```

Luego en `.env.server`:

```env
AWS_PROFILE=syslab-backend-assumer
```

Y reiniciar:

```bash
docker compose -f tools/docker/compose.server.yml down
docker compose -f tools/docker/compose.server.yml up -d
```

Ventaja:

- separacion mas clara entre credenciales del servidor y credenciales operativas de SysLab

En la instalacion actual del proyecto, esta opcion B es la recomendada y la validada.

## Paso a paso recomendado en servidor

### 1. Crear el perfil tecnico en AWS

- usuario IAM: `syslab-backend-assumer`
- sin acceso de consola
- con permiso `sts:AssumeRole` sobre los roles `syslab-*` necesarios

### 2. Guardar credenciales en el host Ubuntu

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

### 3. Configurar `.env.server`

```env
AWS_PROFILE=syslab-backend-assumer
AWS_DEFAULT_REGION=us-east-1
```

Notas:

- `compose.server.yml` ya fija `AWS_SDK_LOAD_CONFIG=1` dentro del contenedor
- la variable importante que decides en `.env.server` es el perfil base real que debe usar el backend

### 4. Recrear el stack

```bash
docker compose -f tools/docker/compose.server.yml down
docker compose -f tools/docker/compose.server.yml up -d
```

### 5. Verificar la identidad base del backend

```bash
docker compose -f tools/docker/compose.server.yml exec backend \
python manage.py shell -c "
import boto3, os
print('AWS_PROFILE=', os.getenv('AWS_PROFILE'))
print('AWS_DEFAULT_REGION=', os.getenv('AWS_DEFAULT_REGION'))
print(boto3.Session().client('sts').get_caller_identity())
"
```

Lo esperado es:

```text
arn:aws:iam::034739223309:user/syslab-backend-assumer
```

### 6. Verificar una `Cloud Connection` con `AssumeRole`

```bash
docker compose -f tools/docker/compose.server.yml exec backend \
python manage.py shell -c "
from api.models import CloudConnection
from api.cloud_connections import test_aws_connection
c = CloudConnection.objects.get(name='Redes-1')
print(test_aws_connection(c))
"
```

Lo esperado es:

```python
(True, 'sts_ok', {...})
```

## Errores tipicos y como leerlos

### `InvalidClientTokenId`

Significa:

- la identidad base del backend es invalida

No suele ser problema de trust policy ni de `ExternalId`.

Revisar:

- `~/.aws/credentials`
- access key desactivada o rotada
- perfil activo en `.env.server`

### `AccessDenied` al llamar `AssumeRole`

Significa:

- la identidad base ya autentica
- pero no fue autorizada a asumir el role

Revisar:

- trust policy del role
- policy del usuario `syslab-backend-assumer`
- `ExternalId` de la `Cloud Connection`

## Cómo probar AssumeRole desde el backend

```bash
cd ~/apps/syslab-monorepo-front-back
docker compose -f tools/docker/compose.server.yml exec backend \
python manage.py shell -c "
import boto3
resp = boto3.Session().client('sts').assume_role(
    RoleArn='arn:aws:iam::034739223309:role/syslab-course-redes1-role',
    RoleSessionName='debug-redes1',
    ExternalId='syslab-course-redes1',
)
print('ok', bool(resp.get('Credentials')))
"
```

Si eso falla con `AccessDenied`, el problema es IAM. No es del navegador ni de Docker.

## Recomendacion operativa

Para no confundirse:

- primero verifica la identidad base del backend
- si cambias `AWS_PROFILE` o `AWS_DEFAULT_REGION`, recrea el stack para que el contenedor vea el valor nuevo
- luego ajusta la trust policy del role a esa identidad real
- después ajusta la policy de esa identidad para `sts:AssumeRole`
- recién ahí prueba la `Cloud Connection`

## Documentos relacionados

- [Servidor Ubuntu en LAN](./README.md)
- [Deploy LAN con Caddy](./deploy-lan-caddy.md)
- [Plataforma en AWS](../aws.md)
