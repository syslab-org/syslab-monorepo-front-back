# 📟 Bitácora del Proyecto Backend - Tesis

## 🧠 Contexto general

Este proyecto es un sistema backend desarrollado en Django que incluye procesamiento asincrónico de tareas con Celery y una interfaz de monitoreo con Flower. Redis actúa como intermediario entre Django y Celery, y todo está contenido usando Docker y Docker Compose.

---

## 🛠️ Fase 1: Preparación local del entorno

### 🔹 ¿Qué se hizo?

1. Instalación y ejecución local de Redis.
2. Configuración de Celery en Django.
3. Creación de una tarea de prueba: `prueba_larga`.

### 🔹 ¿Para qué?

Verificar que los componentes principales (Django + Celery + Redis) funcionan correctamente fuera de Docker.

---

## 🐳 Fase 2: Dockerización del proyecto

### 🔹 ¿Qué se hizo?

1. Se creó un `Dockerfile` para empaquetar el backend de Django.
2. Se escribió un archivo `docker-compose.yml` con los siguientes servicios:
   - `web`: contenedor del backend Django.
   - `redis`: servidor Redis.
   - `celery`: worker para tareas asincrónicas.
   - `flower`: interfaz web para monitoreo de tareas.

### 🔹 ¿Para qué?

Levantar todo el sistema con un solo comando, facilitando la ejecución, pruebas y despliegue:

```bash
docker compose up --build
```

---

## 🧪 Fase 3: Pruebas de funcionamiento

### 🔹 ¿Qué se hizo?

1. Se accedió a Django dentro del contenedor:
   ```bash
   docker exec -it tesis-backend python manage.py shell
   ```
2. Se lanzó la tarea Celery:
   ```python
   from api.tasks import prueba_larga
   prueba_larga.delay()
   ```
3. Se verificó en consola que la tarea fue ejecutada exitosamente.
4. Se accedió a Flower para monitoreo: [http://localhost:5555](http://localhost:5555)

### 🔹 ¿Para qué?

Asegurar que los servicios se comunican correctamente y que Celery procesa las tareas sin errores.

---

## ☁️ Fase 4: Despliegue en Render

### 🔹 ¿Qué se hizo?

1. Se conectó Render con el repositorio de GitHub que contiene el backend.

2. Se eligió “Create Web Service”.

3. Se configuró:

   - **Branch**: `main`
   - **Docker Build Context**: `.` (raíz del proyecto)
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: Free
   - **Auto-Deploy**: activado por defecto

4. Se agregaron variables de entorno en el panel:

   - `SECRET_KEY`
   - `DEBUG`
   - `ALLOWED_HOSTS`
   - `DATABASE_URL` (PostgreSQL desde Render)
   - `REDIS_URL` (de Render Redis Key-Value)

5. Se ajustó el `settings.py`:

   ```python
   redis_url = config('REDIS_URL', default='redis://localhost:6379/0').replace('rediss://', 'redis://')
   CELERY_BROKER_URL = redis_url
   CELERY_RESULT_BACKEND = redis_url
   ```

6. Se creó un `entrypoint.sh` que aplica migraciones, crea un superusuario y lanza el servidor con Gunicorn.

7. Se creó un **Background Worker en Render**:

   - Plataforma: Docker
   - Docker Command:
     ```bash
     celery -A teg worker --loglevel=INFO --pool=solo
     ```
   - Usa el mismo `Dockerfile` y variables que el web service.

8. Se probó Celery directamente desde el shell:

   ```bash
   python manage.py shell
   >>> from api.tasks import prueba_larga
   >>> prueba_larga.delay(5)
   ```

   Logs confirmaron:

   ```
   Task api.tasks.prueba_larga[...] received
   Tarea completada tras 5s
   Task api.tasks.prueba_larga[...] succeeded in 5.01s
   ```

9. Se desplegó **Flower como Web Service**:

   - Se usó un nuevo servicio en Render configurado como Docker.
   - Comando de arranque:
     ```bash
     celery -A teg flower --port=5555 --address=0.0.0.0
     ```
   - Se aseguró que `flower` esté en `requirements.txt`.
   - La interfaz de monitoreo ahora está disponible públicamente y conectada al mismo `REDIS_URL`.

### 🔹 ¿Para qué?

Tener tareas asincrónicas totalmente funcionales en producción, con Redis en la nube, ejecución persistente de Celery en segundo plano, y monitoreo completo a través de Flower.

---

## ✅ Estado actual

- ✅ Backend funcional desplegado en Render con Docker.
- ✅ Redis y Celery funcionando en producción.
- ✅ Tareas ejecutadas exitosamente en background desde el shell.
- ✅ Worker aislado en Background Service de Render.
- ✅ Flower desplegado como Web Service en Render.
- ✅ Migraciones y superusuario automatizados al inicio.
- ✅ Arquitectura adaptable tanto para entorno local como productivo.

---

## 🔜 Próximo paso

1. 🔒 Configurar seguridad de producción (HTTPS, claves rotadas, etc.).
2. 🕒 Implementar tareas periódicas con Celery Beat.
3. 📊 Integrar monitoreo/logging adicional si es necesario.
