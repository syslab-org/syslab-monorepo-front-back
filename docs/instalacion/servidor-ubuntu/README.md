# Servidor Ubuntu en LAN

Esta guia organiza lo necesario para levantar la app en un Ubuntu Server o una ThinkPad dentro de la red local cuando el servidor puede alojar varios proyectos al mismo tiempo.

El flujo descrito aqui ya fue validado con esta topologia:

- repo SysLab en `~/apps/syslab-monorepo-front-back`
- proxy central en `~/apps/reverse-proxy`
- acceso LAN funcionando por `http://192.168.1.149/`

Importante:

- esta ruta ya no publica `:80` ni `:443` directamente desde SysLab
- el `caddy` interno de SysLab se conecta a una red Docker externa `edge`
- el Caddy central del host publica SysLab por IP LAN o por un hostname como `syslab.lan`
- la estrategia general del servidor compartido esta en [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md)

## Cuándo usar esta ruta

Usa este flujo si quieres:

- acceder a la app desde otros equipos de la LAN
- exponer la app mediante un proxy central del servidor
- mantener `frontend`, `backend`, `postgres` y `redis` cerrados detras de Docker

El stack de este entorno usa `tools/docker/compose.server.yml`.

## Flujo recomendado

1. Instalar dependencias del host:

```bash
sudo apt update
sudo apt install -y git make curl jq awscli
```

Instala Docker Engine y Docker Compose plugin con el metodo oficial de Docker para Ubuntu.

2. Clonar el repo en el servidor:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DEL_REPO> syslab-monorepo-front-back
cd ~/apps/syslab-monorepo-front-back
```

3. Preparar `.env.server`:

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

4. Configurar AWS en el host si el servidor hará deploy real:

```bash
aws configure --profile tesis
aws sts get-caller-identity --profile tesis
chmod 600 ~/.aws/credentials ~/.aws/config
```

5. Crear la red Docker compartida del host:

```bash
docker network create edge
```

Si ya existe, no pasa nada.

6. Levantar el stack de SysLab:

```bash
make server-up
```

7. Verificar SysLab desde el host:

```bash
make server-ps
curl http://127.0.0.1:18080/healthz/
curl -H 'Host: syslab.lan' http://127.0.0.1:18080/
```

8. Crear el stack del proxy central del host en `~/apps/reverse-proxy`

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

9. Verificar el proxy central:

```bash
curl -i -H 'Host: syslab.lan' http://127.0.0.1
curl -i http://192.168.1.149
docker network inspect edge
```

Resultado esperado:

- `host-reverse-proxy` visible en la red `edge`
- `tesis-server-caddy` visible en la red `edge`
- acceso funcional por `http://192.168.1.149/`

10. Publicar SysLab desde el Caddy central del host

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

## Operacion diaria

```bash
make server-logs
make server-restart
make server-down
```

## Documentos relacionados

- [Deploy LAN con Caddy](./deploy-lan-caddy.md)
- [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md)
- [Instalacion general](../README.md)
- [Plataforma en AWS](../aws.md)
