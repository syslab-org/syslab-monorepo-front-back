# Deploy LAN en Ubuntu Server con Caddy

Esta guia deja el stack sirviendo por LAN en una maquina Ubuntu Server, por ejemplo en `http://192.168.1.149/`, sin publicar directamente los puertos internos del frontend, backend, Postgres ni Redis.

## 1. Arquitectura resultante

- `frontend` corre en Vite dentro de Docker, solo en la red interna del compose
- `backend` corre con Gunicorn, migraciones automaticas y `collectstatic`
- `celery`, `postgres` y `redis` quedan internos
- `caddy` expone la entrada publica unica en `:80`
- opcionalmente `cloudflared` publica ese mismo `caddy` hacia internet

Rutas publicas:

- `/api/*`, `/healthz/`, `/admin/*`, `/static/*` -> `backend:8000`
- todo lo demas -> `frontend:5173`

## 2. Archivos involucrados

- `tools/docker/compose.server.yml`
- `tools/caddy/Caddyfile`
- `.env.server.example`
- `Makefile`

## 3. Preparacion en Ubuntu

Asumiendo el repo clonado en `/opt/syslab-monorepo-front-back`:

```bash
cd /opt/syslab-monorepo-front-back
cp .env.server.example .env.server
nano .env.server
```

Valores minimos a revisar en `.env.server`:

- `SECRET_KEY`
- `ALLOWED_HOSTS=192.168.1.149,localhost,127.0.0.1`
- `CSRF_TRUSTED_ORIGINS=http://192.168.1.149,http://localhost`
- `AWS_PROFILE=tesis` si usaras `~/.aws`

Si la maquina no tiene el profile AWS creado todavia:

```bash
aws configure --profile tesis
```

## 4. Levantar el deploy completo

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

## 5. Pruebas locales en el servidor

```bash
curl http://localhost/healthz/
curl http://localhost/
curl http://192.168.1.149/healthz/
```

Si todo esta bien, la app deberia abrir en:

```text
http://192.168.1.149/
```

## 6. Firewall recomendado

Para acceso solo por LAN:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

No hace falta abrir:

- `5173`
- `8000`
- `5432`
- `6379`
- `5555`

## 7. Cloudflare Tunnel opcional

### Quick Tunnel

```bash
make server-quick-tunnel-up
make server-quick-tunnel-logs
```

### Tunnel estable

Completa `CLOUDFLARE_TUNNEL_TOKEN` en el entorno o exportalo antes de arrancar:

```bash
export CLOUDFLARE_TUNNEL_TOKEN=tu_token_real
make server-tunnel-up
make server-tunnel-logs
```

## 8. Operacion basica

Reiniciar el stack:

```bash
make server-restart
```

Bajarlo:

```bash
make server-down
```

## 9. Notas importantes

- este modo separa el despliegue Ubuntu/LAN del `compose.dev.yml`
- el backend ya sirve `/admin/` y archivos estaticos detras de Caddy
- `DEBUG=false` queda habilitado para el servidor, pero con cookies no seguras a proposito porque esta etapa usa `HTTP` por LAN
- si luego migramos a `HTTPS` con dominio, conviene cambiar en `.env.server`:
  - `SESSION_COOKIE_SECURE=1`
  - `CSRF_COOKIE_SECURE=1`
