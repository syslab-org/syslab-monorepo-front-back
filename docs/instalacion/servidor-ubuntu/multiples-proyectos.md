# Servidor Ubuntu con Multiples Proyectos

Este documento deja registrada la estrategia recomendada para usar un mismo Ubuntu Server como host de varios proyectos independientes, incluyendo SysLab.

No intenta convertir este repo en el orquestador de todos los proyectos del servidor. Su objetivo es dejar claro cómo debe convivir SysLab con otros stacks sin asumir que es el unico servicio del host.

## 1. Problema a resolver

Un servidor Ubuntu compartido necesita que varios proyectos web convivan sin competir por los puertos publicos del host.

En ese escenario quieres poder alojar, por ejemplo:

- SysLab
- un proyecto Magento
- un WordPress
- una API independiente
- un panel interno

El conflicto principal es simple:

- solo un proceso puede adueñarse de `:80`
- solo un proceso puede adueñarse de `:443`

## 2. Decision recomendada

Para un servidor con multiples proyectos, usar esta arquitectura:

1. un unico reverse proxy de entrada para todo el host
2. un stack Docker independiente por proyecto
3. cada proyecto con su propia base de datos, Redis, volumenes y variables
4. enrutamiento por dominio, subdominio o hostname LAN

Traduccion practica:

- `Caddy` o `Nginx` central escucha en `:80` y `:443`
- SysLab deja de ser el dueño exclusivo del puerto `80`
- Magento corre en su propio stack
- el proxy central decide a qué proyecto mandar cada request

## 3. Modelo recomendado para este servidor

### Opcion preferida: proxy central + stacks aislados

Ejemplo conceptual:

- `syslab.lan` o `192.168.1.149` -> SysLab
- `magento.lan` -> Magento
- `panel.lan` -> otro proyecto

Cada proyecto vive en su carpeta:

```text
~/apps/reverse-proxy
~/apps/syslab-monorepo-front-back
~/apps/magento
~/apps/otro-proyecto
```

Cada carpeta tiene su propio `docker compose`.

## 4. Que significa esto para SysLab

En modo servidor compartido, SysLab no deberia publicar directamente `80:80` desde su propio compose.

La implicancia para este repo es:

- `tools/docker/compose.server.yml` ahora representa el modo oficial para host compartido
- para convivir con otros proyectos, SysLab deberia operar detras de un proxy central externo a este repo
- ese proxy central puede vivir en otro repo, otra carpeta del host o una administracion manual del servidor

## 5. Adaptacion recomendada de SysLab en modo compartido

Cuando SysLab conviva con otros proyectos, la forma recomendada es esta:

### Dentro del stack SysLab

- mantener `frontend`, `backend`, `celery`, `postgres` y `redis`
- no exponer `postgres`, `redis` ni servicios internos al exterior
- mantener el `caddy` interno conectado a la red Docker externa `edge`
- dejar `127.0.0.1:${SERVER_HTTP_PORT:-18080}` como punto de chequeo y depuracion desde el host

### En el host compartido

- mantener un proxy central escuchando en `:80` y `:443`
- usar dominios o subdominios distintos por proyecto
- conectar el proxy central con cada stack por red Docker compartida o por puertos internos controlados

## 6. Dos patrones validos

### Patron A: red Docker compartida

Es el patron mas limpio cuando casi todo corre en Docker.

- el proxy central participa en una red Docker externa, por ejemplo `edge`
- cada proyecto se conecta tambien a esa red
- el proxy central resuelve por nombre de servicio o alias Docker

Ventajas:

- no necesitas publicar puertos de aplicacion en el host
- reduces superficie expuesta
- el enrutamiento queda mas ordenado

### Patron B: puertos internos por proyecto

Es mas simple de entender si estas empezando, pero no es el patron que quedó validado para SysLab.

- SysLab publica, por ejemplo, `127.0.0.1:18080 -> caddy interno`
- Magento publica `127.0.0.1:18081 -> nginx interno`
- el proxy central escucha en `:80/:443` y reenvia a esos puertos locales

Ventajas:

- mas facil de depurar al inicio
- no obliga a entender redes Docker externas

Costo:

- introduces mas puertos internos que hay que administrar

## 7. Recomendacion especifica para SysLab

Para este proyecto, la recomendacion mas estable es:

1. usar `compose.server.yml` como despliegue oficial para host compartido
2. conectar el `caddy` interno de SysLab y el proxy central a la red Docker externa `edge`
3. dejar que el Caddy central del servidor publique SysLab por IP LAN o por un hostname como `syslab.lan`
4. no mezclar otros proyectos dentro del mismo compose de SysLab

En otras palabras:

- hoy: SysLab ya puede vivir detras de un proxy comun
- los otros proyectos deben convivir como stacks independientes

## 8. Ejemplo conceptual de enrutamiento

```text
Internet / LAN
        |
        v
Reverse Proxy Central (:80/:443)
        |
        +--> syslab.lan   -> stack SysLab
        +--> magento.lan  -> stack Magento
        +--> panel.lan    -> otro stack
```

## 9. Ejemplo de estructura operativa

```text
~/apps/reverse-proxy
  ├── compose.yml
  └── Caddyfile

~/apps/syslab-monorepo-front-back
  ├── .env.server
  └── tools/docker/compose.server.yml

~/apps/magento
  ├── compose.yml
  ├── .env
  └── volumenes propios
```

## 10. Reglas de convivencia entre proyectos

- no compartir bases de datos entre proyectos distintos
- no compartir Redis entre proyectos distintos salvo que haya una razon muy clara
- no publicar puertos innecesarios al host
- usar nombres de contenedor, volumen y red que no colisionen
- preferir subdominios o hostnames distintos sobre puertos publicos distintos
- centralizar certificados HTTPS en un solo proxy cuando sea posible
- respaldar por proyecto, no como un bloque unico sin separacion

## 11. Implicancias para Magento u otros stacks

Magento no deberia meterse dentro del compose de SysLab.

Debe vivir como proyecto separado, con sus propias dependencias, por ejemplo:

- `nginx` o `apache`
- `php-fpm`
- `mariadb`
- `redis`
- `opensearch`
- volumenes propios

La relacion con SysLab es solo de convivencia en el mismo host y uso del mismo proxy de entrada.

## 12. Implementacion validada en este proyecto

Flujo ya validado en Ubuntu:

1. `make server-up` en `~/apps/syslab-monorepo-front-back`
2. `docker network create edge`
3. `docker compose up -d` en `~/apps/reverse-proxy`
4. `Caddyfile` central apuntando a `reverse_proxy syslab:80`
5. acceso funcional por `http://192.168.1.149/`

## 13. Decision registrada para este repo

Queda registrado que:

- `compose.server.yml` sustituye el esquema anterior y pasa a ser el modo oficial de SysLab para servidor Ubuntu compartido
- la arquitectura recomendada para el host es `proxy central + stacks independientes`
- cualquier otro proyecto del servidor debe convivir como stack separado, con su propio runtime, datos y dominios

## 14. Documentos relacionados

- [Servidor Ubuntu en LAN](./README.md)
- [Deploy LAN con Caddy](./deploy-lan-caddy.md)
- [Instalacion general](../README.md)
