#!/bin/bash

# Salir si ocurre algún error
set -e

# Aplicar migraciones
echo "⏳ Aplicando migraciones..."
python manage.py migrate --noinput

# Crear superusuario si no existe
echo "🛠 Creando superusuario si no existe..."
python manage.py shell < create_superuser.py

# Modo producción o desarrollo
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Iniciando servidor con Gunicorn en modo producción..."
    exec gunicorn teg.wsgi:application --bind 0.0.0.0:${PORT:-8000}
else
    # Detectar si el servicio es Celery
    if [[ "$1" = "celery" ]]; then
        echo "🚀 Iniciando worker Celery..."
        shift  # quitar "celery"
        exec celery "$@"
    else
        echo "🚀 Iniciando servidor Django..."
        exec python manage.py runserver 0.0.0.0:8000
    fi
fi
