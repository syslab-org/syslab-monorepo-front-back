# Servidor Ubuntu en LAN

Esta guia organiza lo necesario para levantar la app en un Ubuntu Server o una ThinkPad dentro de la red local cuando el servidor puede alojar varios proyectos al mismo tiempo.

Importante:

- esta ruta ya no publica `:80` ni `:443` directamente desde SysLab
- SysLab se publica solo en `127.0.0.1:<puerto>` y debe quedar detras de un Caddy central del host
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
sudo mkdir -p /opt/syslab
sudo chown "$USER":"$USER" /opt/syslab
cd /opt/syslab
git clone <URL_DEL_REPO> syslab-monorepo-front-back
cd syslab-monorepo-front-back
```

3. Preparar `.env.server`:

```bash
cp .env.server.example .env.server
chmod 600 .env.server
```

Ejemplo minimo para una instalacion publicada por un Caddy central:

```env
DEBUG=false
SECRET_KEY=reemplaza-esta-clave
ALLOWED_HOSTS=syslab.lan,syslab.example.com,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://syslab.example.com,http://syslab.lan,http://localhost
SESSION_COOKIE_SECURE=1
CSRF_COOKIE_SECURE=1
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

5. Levantar el stack:

```bash
make server-up
```

6. Verificar:

```bash
make server-ps
curl http://127.0.0.1:18080/healthz/
curl -H 'Host: syslab.lan' http://127.0.0.1:18080/
```

7. Publicar SysLab desde el Caddy central del host

Ejemplo conceptual del `Caddyfile` central:

```caddy
syslab.lan {
  reverse_proxy syslab:80
}

syslab.example.com {
  reverse_proxy syslab:80
}
```

Para que eso funcione, el `caddy` central del host y el `caddy` interno de SysLab deben compartir una red Docker externa, por ejemplo `edge`.

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
