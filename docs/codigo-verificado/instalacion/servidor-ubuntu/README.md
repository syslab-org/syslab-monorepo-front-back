# Servidor Ubuntu en LAN

Esta carpeta documenta el modo validado para correr SysLab en una ThinkPad o Ubuntu Server dentro de la red local, compartiendo el host con otros proyectos.

Topologia validada:

- repo SysLab en `~/apps/syslab-monorepo-front-back`
- proxy central del host en `~/apps/reverse-proxy`
- red Docker compartida `edge`
- acceso LAN funcionando por `http://192.168.1.149/`

## Que debes leer primero

1. Esta guia: panorama general y orden recomendado.
2. [Deploy LAN con Caddy](./deploy-lan-caddy.md): detalle del stack SysLab + proxy central.
3. [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md): convivencia con otros proyectos.
4. [AWS runtime y AssumeRole](./aws-runtime-assumerole.md): como se resuelven credenciales AWS desde el backend.
5. [Playbook de Key Pairs y Acceso SSH en AWS](../../operacion/aws/key-pairs-ssh-playbook.md): escenarios probados para acceso SSH de estudiantes despues del deploy.
6. En la misma guia de `Deploy LAN con Caddy` ya quedo registrado como habilitar una URL temporal o estable con Cloudflare.

## Mapa mental

- `tools/docker/compose.server.yml` levanta solo el stack de SysLab.
- SysLab ya no publica `:80` ni `:443` como dueño del host.
- El `caddy` interno de SysLab entra a la red Docker externa `edge` con alias `syslab`.
- Un `Caddy` central del host publica la app a la LAN o a internet.
- Las credenciales AWS reales que usa el backend viven en `~/.aws` del servidor y se montan dentro del contenedor.
- Una `Cloud Connection` con `AssumeRole` aporta `Role ARN` y `External ID`, pero la llamada base a STS la hace el backend con su `AWS_PROFILE` actual.

## Cuándo usar esta ruta

Usa este flujo si quieres:

- acceder a la app desde otros equipos de la LAN
- dejar el servidor listo para varios proyectos
- mantener `frontend`, `backend`, `postgres` y `redis` cerrados detras de Docker

## Orden recomendado

1. Preparar el host Ubuntu
2. Preparar `.env.server`
3. Configurar `~/.aws` del servidor si habrá deploy real
4. Crear la red Docker `edge`
5. Levantar SysLab
6. Levantar el proxy central del host
7. Verificar acceso LAN
8. Recién después configurar `Cloud Connections` y `AssumeRole`

## Paso a paso

### 1. Instalar dependencias del host

```bash
sudo apt update
sudo apt install -y git make curl jq awscli
```

Instala Docker Engine y Docker Compose plugin con el metodo oficial de Docker para Ubuntu.

### 2. Clonar el repo en el servidor

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DEL_REPO> syslab-monorepo-front-back
cd ~/apps/syslab-monorepo-front-back
```

### 3. Preparar `.env.server`

```bash
cp .env.server.example .env.server
chmod 600 .env.server
```

Ejemplo minimo para una instalacion LAN publicada por un Caddy central:

```env
DEBUG=false
SECRET_KEY=reemplaza-esta-clave
ALLOWED_HOSTS=syslab.lan,192.168.1.149,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://192.168.1.149,http://syslab.lan,http://localhost
SESSION_COOKIE_SECURE=0
CSRF_COOKIE_SECURE=0
SERVER_HTTP_BIND_HOST=127.0.0.1
SERVER_HTTP_PORT=18080
AWS_PROFILE=tesis
AWS_DEFAULT_REGION=us-east-1
```

### 4. Configurar AWS en el host si el servidor hará deploy real

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
chmod 600 ~/.aws/credentials ~/.aws/config
```

Importante:

- ese `AWS_PROFILE` no es para el navegador ni para el usuario final
- es la identidad base del backend dentro del contenedor
- si luego una `Cloud Connection` usa `AssumeRole`, el backend intentará asumir el role con este perfil base
- el valor sale de `.env.server`, no del shell interactivo del host
- si cambias `AWS_PROFILE` o `AWS_DEFAULT_REGION`, recrea el stack con `down` + `up -d`

### 5. Crear la red Docker compartida del host

```bash
docker network create edge
```

Si ya existe, no pasa nada.

### 6. Levantar el stack de SysLab

```bash
make server-up
```

### 7. Verificar SysLab desde el host

```bash
make server-ps
curl http://127.0.0.1:18080/healthz/
curl -H 'Host: syslab.lan' http://127.0.0.1:18080/
```

### 8. Crear el stack del proxy central del host en `~/apps/reverse-proxy`

`compose.yml`:

```yaml
services:
  caddy:
    image: caddy:2.9-alpine
    container_name: host-reverse-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - edge

volumes:
  caddy_data:
  caddy_config:

networks:
  edge:
    external: true
```

`Caddyfile`:

```caddy
:80 {
  encode gzip zstd

  @syslab host syslab.lan 192.168.1.149
  handle @syslab {
    reverse_proxy syslab:80
  }

  respond "Host no configurado en este servidor" 404
}
```

Levantarlo:

```bash
cd ~/apps/reverse-proxy
docker compose up -d
docker compose ps
```

### 9. Verificar el proxy central

```bash
curl -i -H 'Host: syslab.lan' http://127.0.0.1
curl -i http://192.168.1.149
docker network inspect edge
```

Resultado esperado:

- `host-reverse-proxy` visible en la red `edge`
- `tesis-server-caddy` visible en la red `edge`
- acceso funcional por `http://192.168.1.149/`

Nota de rutas:

- el frontend de SysLab vive bajo rutas como `/admin/dashboard`
- el admin real de Django queda en `/django-admin/`
- esa separacion evita que un hard reload de navegador en `/admin/*` termine en el login del admin de Django

### 10. Publicar SysLab desde el Caddy central del host

En el escenario validado no hace falta dominio propio.

```caddy
:80 {
  @syslab host syslab.lan 192.168.1.149
  handle @syslab {
    reverse_proxy syslab:80
  }
}
```

Si quieres usar `syslab.lan` desde otro equipo de la red y tu router no resuelve ese nombre, agrega en el cliente una entrada en `/etc/hosts` o el archivo equivalente:

```text
192.168.1.149 syslab.lan
```

## Verificaciones utiles

### Identidad AWS base del backend

```bash
docker compose -f tools/docker/compose.server.yml exec backend \
python manage.py shell -c "
import boto3, os
print('AWS_PROFILE=', os.getenv('AWS_PROFILE'))
print(boto3.Session().client('sts').get_caller_identity())
"
```

### Salud del stack

```bash
curl http://127.0.0.1:18080/healthz/
docker network inspect edge
make server-logs
```

## Operacion diaria

```bash
make server-logs
make server-restart
make server-down
```

## Documentos relacionados

- [Deploy LAN con Caddy](./deploy-lan-caddy.md)
- [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md)
- [AWS runtime y AssumeRole](./aws-runtime-assumerole.md)
- [Instalacion general](../README.md)
- [Plataforma en AWS](../aws.md)
