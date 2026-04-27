# Publicacion de la ThinkPad con Caddy + Cloudflare Tunnel

Esta guia expone la app desde la ThinkPad sin abrir puertos en el router.

## 1. Requisitos

- El stack base ya debe estar arriba con `make up`
- Debes tener una cuenta de Cloudflare
- Debes crear un Tunnel en Cloudflare Zero Trust

Documentacion oficial:

- https://developers.cloudflare.com/tunnel/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/

## 2. Archivos nuevos

- `tools/docker/compose.public.yml`
- `tools/caddy/Caddyfile`
- `.env.public.example`

## 3. Caddy como entrada unica

`Caddy` expone una sola entrada publica:

- `/api/*`, `/healthz/`, `/admin/*`, `/static/*` -> `backend:8000`
- todo lo demas -> `frontend:5173`

Para levantarlo:

```bash
make public-up
```

Pruebas locales desde la ThinkPad:

```bash
curl http://localhost/
curl http://localhost/healthz/
```

## 4. Cloudflare Tunnel

### Opcion recomendada para tesis: Quick Tunnel sin dominio

Esto te da una URL temporal `trycloudflare.com` sin comprar dominio y sin abrir puertos del router.

Levanta primero Caddy:

```bash
make public-up
```

Luego arranca el Quick Tunnel:

```bash
make quick-tunnel-up
make quick-tunnel-logs
```

En los logs veras una URL tipo:

```text
https://random-words-example.trycloudflare.com
```

Esa URL ya deberia abrir tu app desde internet.

Para apagarlo:

```bash
make quick-tunnel-down
```

Notas:

- la URL es temporal
- es suficiente para demo, validacion y presentacion de tesis
- si reinicias o recreas el tunnel, la URL puede cambiar

### Opcion recomendada: tunnel estable con dominio

1. En Cloudflare Zero Trust crea un Tunnel
2. Agrega un `Public hostname`
3. Apuntalo al servicio `http://caddy:80`
4. Copia el `token`

En la ThinkPad:

```bash
cd ~/apps/syslab-monorepo-front-back
cp .env.public.example .env.public
nano .env.public
```

Completa:

```bash
CLOUDFLARE_TUNNEL_TOKEN=tu_token_real
```

Luego:

```bash
docker compose --env-file .env.public -f tools/docker/compose.dev.yml -f tools/docker/compose.public.yml up -d cloudflared
```

O usando `make`:

```bash
export CLOUDFLARE_TUNNEL_TOKEN=tu_token_real
make tunnel-up
```

Logs:

```bash
make tunnel-logs
```

## 5. Firewall recomendado

Si publicas solo por Cloudflare Tunnel, deja abierto solo:

- `22` para SSH
- `80` y `443` si usaras Caddy directo por LAN o pruebas locales

No abras ni publiques directamente:

- `5173`
- `8000`
- `5555`
- `5432`
- `6379`

## 6. Notas

- Esto publica el stack actual tal como esta hoy, incluyendo frontend en modo dev con Vite
- El Quick Tunnel es suficiente para demo, tesis y piloto
- Para un endurecimiento mayor, el siguiente paso seria servir un build estatico del frontend y ocultar por completo el puerto `5173`
