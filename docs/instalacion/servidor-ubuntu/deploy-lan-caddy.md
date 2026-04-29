# Deploy de SysLab Detras de un Caddy Central

Esta guia deja el stack de SysLab listo para correr en un Ubuntu Server compartido, con un `caddy` interno del proyecto y un `Caddy` central del host como puerta de entrada.

Importante:

- este documento ya asume un host con multiples proyectos
- `compose.server.yml` no debe competir por `:80` ni `:443`
- el Caddy que sale a la LAN o a internet vive fuera de este repo
- para el contexto general, revisa [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md)

## 1. Arquitectura resultante

- `frontend` corre en Vite dentro de Docker, solo en la red interna del compose
- `backend` corre con Gunicorn, migraciones automaticas y `collectstatic`
- `celery`, `postgres` y `redis` quedan internos
- `caddy` interno de SysLab sigue expuesto en `127.0.0.1:${SERVER_HTTP_PORT:-18080}` para chequeos y depuracion desde el host
- ese `caddy` interno tambien entra a la red Docker externa `edge` con alias `syslab`
- un `Caddy` central del host expone SysLab por IP LAN o por un hostname LAN como `syslab.lan`

Rutas publicas:

- `/api/*`, `/healthz/`, `/django-admin/*`, `/static/*` -> `backend:8000`
- todo lo demas -> `frontend:5173`

Importante sobre rutas:

- la SPA del frontend usa `/admin/*` como espacio de navegacion interno
- el Django admin del backend fue movido a `/django-admin/*`
- esto evita que un hard reload en rutas como `/admin/dashboard` caiga en el admin de Django

## 2. Archivos involucrados

- `tools/docker/compose.server.yml`
- `tools/caddy/Caddyfile`
- `.env.server.example`
- `Makefile`
- `~/apps/reverse-proxy/compose.yml`
- `~/apps/reverse-proxy/Caddyfile`

## 3. Preparacion de SysLab en Ubuntu

Asumiendo el repo clonado en `~/apps/syslab-monorepo-front-back`:

```bash
cd ~/apps/syslab-monorepo-front-back
cp .env.server.example .env.server
nano .env.server
```

Valores minimos a revisar en `.env.server`:

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `SERVER_HTTP_BIND_HOST=127.0.0.1`
- `SERVER_HTTP_PORT=18080`
- `SESSION_COOKIE_SECURE=0` y `CSRF_COOKIE_SECURE=0` si el acceso sera solo por HTTP en LAN
- `AWS_PROFILE=tesis` si usaras `~/.aws`

Si la maquina no tiene el profile AWS creado todavia:

```bash
aws configure --profile tesis
```

## 4. Crear la red Docker compartida del host

```bash
docker network create edge
```

Si la red ya existe, Docker lo indicara y puedes seguir.

## 5. Levantar el stack de SysLab

```bash
make server-up
```

Esto levanta:

- frontend
- backend
- celery
- postgres
- redis
- caddy

Ver estado:

```bash
make server-ps
```

Ver logs:

```bash
make server-logs
```

## 6. Pruebas locales dentro del servidor

```bash
curl http://127.0.0.1:18080/healthz/
curl -H 'Host: syslab.lan' http://127.0.0.1:18080/
```

Si todo esta bien, SysLab deberia responder en el puerto local privado configurado.

## 7. Crear y levantar el Caddy central del host

Crear la carpeta:

```bash
mkdir -p ~/apps/reverse-proxy
cd ~/apps/reverse-proxy
```

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
docker compose up -d
docker compose ps
```

## 8. Verificar el Caddy central

```bash
curl -i -H 'Host: syslab.lan' http://127.0.0.1
curl -i http://192.168.1.149
docker network inspect edge
```

Con eso:

- desde la LAN podrias entrar por `http://syslab.lan`
- o directamente por `http://192.168.1.149`

Importante:

- el `caddy` central del host y el `caddy` interno de SysLab deben compartir una red Docker externa, por ejemplo `edge`
- por eso el proxy central debe apuntar a `syslab:80`, no a `127.0.0.1:18080`

Si quieres usar `syslab.lan` desde otro equipo, agrega en el cliente:

```text
192.168.1.149 syslab.lan
```

## 9. Firewall recomendado

Para un host compartido:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

No hace falta abrir al exterior:

- `5173`
- `8000`
- `18080`
- `5432`
- `6379`
- `5555`

## 10. Operacion basica

Reiniciar el stack:

```bash
make server-restart
```

Bajarlo:

```bash
make server-down
```

## 11. Notas importantes

- este modo separa el despliegue Ubuntu/LAN del `compose.dev.yml`
- el backend ya sirve `/django-admin/` y archivos estaticos detras del `caddy` interno de SysLab
- el acceso publico real lo controla un `caddy` central del host
- este modo no debe afectar el flujo `local` ni `compose.dev.yml`
- la configuracion LAN validada actualmente funciona sin dominio propio
- si algun dia publicas SysLab por HTTPS real, cambia `SESSION_COOKIE_SECURE=1` y `CSRF_COOKIE_SECURE=1`
