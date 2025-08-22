# 🛠️ Comandos útiles para ejecutar y probar el backend con Django, Celery, Redis y Docker

## 📦 Entorno virtual y dependencias (modo local antes de Dockerizar)

```bash
python3 -m venv env
```
- Crea un entorno virtual en la carpeta `env`.

```bash
source env/bin/activate
```
- Activa el entorno virtual (Linux/macOS).

```bash
env\Scripts\activate
```
- Activa el entorno virtual (Windows).

```bash
pip install -r requirements.txt
```
- Instala las dependencias listadas en `requirements.txt`.

---

## 🐳 Docker y Docker Compose

```bash
docker compose up --build
```
- Construye las imágenes y levanta todos los contenedores definidos en `docker-compose.yml`.

```bash
docker compose down
```
- Detiene y elimina contenedores, redes y volúmenes creados por Docker Compose.

```bash
docker ps
```
- Lista los contenedores en ejecución.

```bash
docker exec -it tesis-backend bash
```
- Abre una terminal dentro del contenedor de Django.

---

## ⚙️ Comandos útiles de Django dentro del contenedor

```bash
docker exec -it tesis-backend python manage.py migrate
```
- Aplica todas las migraciones pendientes de Django.

```bash
docker exec -it tesis-backend python manage.py createsuperuser
```
- Crea un superusuario para acceder al panel de administración de Django.

```bash
docker exec -it tesis-backend python manage.py shell
```
- Abre la consola interactiva de Django para probar funciones o ejecutar código Python.

---

## 🧪 Pruebas de tareas Celery (dentro del `manage.py shell`)

```python
from api.tasks import prueba_larga
prueba_larga.delay()
```
- Envía una tarea de prueba al worker de Celery.

---

## 🌐 Accesos útiles en el navegador

- **Panel de Django Admin**: [http://localhost:8000/admin](http://localhost:8000/admin)
- **Panel de Flower (monitor de Celery)**: [http://localhost:5555](http://localhost:5555)

---

## 🧱 Estructura de contenedores

| Contenedor        | Propósito                             |
|-------------------|----------------------------------------|
| `tesis-backend`   | Django server (`runserver`)            |
| `tesis-celery`    | Worker de Celery                       |
| `tesis-redis`     | Servicio Redis como broker de mensajes |
| `tesis-flower`    | Monitor para ver tareas en Celery      |