# Deploy de SysLab Detras de un Caddy Central

Esta guia deja el stack de SysLab listo para correr en un Ubuntu Server compartido, publicado solo en `127.0.0.1:<puerto>` y expuesto hacia LAN o internet por un Caddy central del host.

Importante:

- este documento ya asume un host con multiples proyectos
- `compose.server.yml` no debe competir por `:80` ni `:443`
- el Caddy que sale a la LAN o a internet vive fuera de este repo
- para el contexto general, revisa [Servidor Ubuntu con multiples proyectos](./multiples-proyectos.md)

## 1. Arquitectura resultante

- `frontend` corre en Vite dentro de Docker, solo en la red interna del compose
- `backend` corre con Gunicorn, migraciones automaticas y `collectstatic`
- `celery`, `postgres` y `redis` quedan internos
- `caddy` interno de SysLab publica la app solo en `127.0.0.1:${SERVER_HTTP_PORT:-18080}`
- un `caddy` central del host expone SysLab por nombre de dominio o hostname LAN

Rutas publicas:

- `/api/*`, `/healthz/`, `/admin/*`, `/static/*` -> `backend:8000`
- todo lo demas -> `frontend:5173`

## 2. Archivos involucrados

- `tools/docker/compose.server.yml`
- `tools/caddy/Caddyfile`
- `.env.server.example`
- `Makefile`
- `Caddyfile` del proxy central del servidor, fuera de este repo

## 3. Preparacion de SysLab en Ubuntu

Asumiendo el repo clonado en `/opt/syslab/syslab-monorepo-front-back`:

```bash
cd /opt/syslab/syslab-monorepo-front-back
cp .env.server.example .env.server
nano .env.server
```

Valores minimos a revisar en `.env.server`:

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `SERVER_HTTP_BIND_HOST=127.0.0.1`
- `SERVER_HTTP_PORT=18080`
- `AWS_PROFILE=tesis` si usaras `~/.aws`

Si la maquina no tiene el profile AWS creado todavia:

```bash
aws configure --profile tesis
```

## 4. Levantar el stack de SysLab

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

## 5. Pruebas locales dentro del servidor

```bash
curl http://127.0.0.1:18080/healthz/
curl -H 'Host: syslab.lan' http://127.0.0.1:18080/
```

Si todo esta bien, SysLab deberia responder en el puerto local privado configurado.

## 6. Publicacion desde el Caddy central del host

Ejemplo conceptual del `Caddyfile` central:

```caddy
syslab.lan {
  reverse_proxy syslab:80
}

syslab.example.com {
  reverse_proxy syslab:80
}
```

Con eso:

- desde la LAN podrias entrar por `http://syslab.lan`
- desde fuera podrias entrar por `https://syslab.example.com`

Importante:

- el `caddy` central del host y el `caddy` interno de SysLab deben compartir una red Docker externa, por ejemplo `edge`
- por eso el proxy central no debe apuntar a `127.0.0.1:18080` desde dentro del contenedor

## 7. Firewall recomendado

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
- el backend ya sirve `/admin/` y archivos estaticos detras del `caddy` interno de SysLab
- el acceso publico real lo controla un `caddy` central del host
- este modo no debe afectar el flujo `local` ni `compose.dev.yml`
- si publicas SysLab por HTTPS desde el proxy central, deja `SESSION_COOKIE_SECURE=1` y `CSRF_COOKIE_SECURE=1`
