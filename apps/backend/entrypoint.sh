#!/bin/bash

# Salir si ocurre algún error
set -e

# Aplicar migraciones
echo "⏳ Aplicando migraciones..."
python manage.py migrate --noinput

# Crear superusuario si no existe
echo "🛠 Creando superusuario si no existe..."
python manage.py shell < create_superuser.py

# Directorios para Terraform (state y workdir)
mkdir -p /tfstate /tfwork

# Importante: si el contenedor corre como usuario no-root (app), no podrá hacer chown.
# En ese caso, te vas a comer "Permission denied" al escribir el state.
# Solución: correr el contenedor como root SOLO durante el entrypoint para ajustar permisos,
# y luego bajar a usuario app para ejecutar Django/Celery.
if [ "$(id -u)" = "0" ]; then
  chown -R app:app /tfstate /tfwork || true
fi

# Helper para ejecutar comandos como usuario app
run_as_app() {
  if [ "$(id -u)" = "0" ]; then
    exec su -s /bin/bash app -c "$*"
  else
    exec bash -lc "$*"
  fi
}

# Modo producción o desarrollo
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Iniciando servidor con Gunicorn en modo producción..."
    run_as_app "gunicorn teg.wsgi:application --bind 0.0.0.0:${PORT:-8000}"
else
    # Detectar si el servicio es Celery
    if [[ "$1" = "celery" ]]; then
        echo "🚀 Iniciando worker Celery..."
        shift  # quitar "celery"
        run_as_app "celery $*"
    else
        echo "🚀 Iniciando servidor Django..."
        run_as_app "python manage.py runserver 0.0.0.0:8000"
    fi
fi
