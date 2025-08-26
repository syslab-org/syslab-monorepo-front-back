from pathlib import Path
from decouple import config, Csv
import dj_database_url
import os

redis_url = config("REDIS_URL", default="redis://localhost:6379/0").replace("rediss://", "redis://")

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = config('DATABASE_URL', default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")

# --- Seguridad y entorno ---
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS_RAW = config('ALLOWED_HOSTS', default='')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_RAW.split(',') if host.strip()]


# --- CORS ---
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_HEADERS = ['*']

# --- Aplicaciones instaladas ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api.apps.ApiConfig',
    'rest_framework',
    'corsheaders',
    'rest_framework.authtoken',
]

# --- Middleware ---
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'teg.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'teg.wsgi.application'

# --- Base de datos ---
DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=DATABASE_URL.startswith('postgres')
    )
}

# --- Validación de contraseñas ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- Internacionalización ---
LANGUAGE_CODE = config('LANGUAGE_CODE', default='en-us')
TIME_ZONE = config('TIME_ZONE', default='UTC')
USE_I18N = True
USE_TZ = True

# --- Archivos estáticos ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# --- Configuración por defecto de IDs ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Celery ---

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Asegura compatibilidad con el namespace 'CELERY'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
