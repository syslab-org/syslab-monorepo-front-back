# apps/backend/teg/settings.py
from pathlib import Path
from decouple import config
import dj_database_url
import os
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================
# Seguridad y entorno
# =========================
SECRET_KEY = config('SECRET_KEY')
DEBUG = config("DEBUG", default="false").lower() == "true"

# Hosts permitidos (CSV: "api.midominio.com,alb-xyz.amazonaws.com")
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "*").split(",") if h.strip()]

# CSRF trusted origins (CSV con esquema: "https://api.midominio.com,https://alb-xyz.amazonaws.com")
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]

# Django detrás de ALB / proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# =========================
# CORS
# =========================
# En dev abrimos todo; en prod especificamos lista blanca
CORS_ALLOW_ALL_ORIGINS = DEBUG

# Lista blanca cuando NO abrimos todo (CSV sin esquema adicional)
# Ej: "http://localhost:5173,https://frontend-produccion.com"
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
]

CORS_ALLOW_HEADERS = list(default_headers)
CORS_ALLOW_CREDENTIALS = True

# =========================
# Apps instaladas
# =========================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',

    'api.apps.ApiConfig',
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# =========================
# Middleware (CORS antes de Common/CSRF)
# =========================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'teg.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],  # agrega rutas si usas templates custom
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

# =========================
# Base de datos
# =========================

# Conexión persistente y SSL (útil en RDS); ajustables por env
DB_CONN_MAX_AGE = int(os.getenv("DB_CONN_MAX_AGE", "600"))
DB_SSL_REQUIRE = os.getenv("DB_SSL_REQUIRE", "").lower() in ("1", "true", "yes")

BASE_DIR = Path(__file__).resolve().parent.parent

# 1) Si viene DATABASE_URL, la usamos tal cual
_database_url = os.getenv("DATABASE_URL", "").strip()

# 2) Si no viene, pero USE_POSTGRES=1, armamos la URL a partir de POSTGRES_*
if not _database_url and os.getenv("USE_POSTGRES", "0") in ("1", "true", "yes"):
    DB_NAME = os.getenv("POSTGRES_DB", "teg")
    DB_USER = os.getenv("POSTGRES_USER", "teg")
    DB_PASS = os.getenv("POSTGRES_PASSWORD", "teg")
    DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")
    _database_url = f"postgres://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 3) Fallback a SQLite para desarrollo
if not _database_url:
    _database_url = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"

DATABASES = {
    "default": dj_database_url.parse(
        _database_url,
        conn_max_age=DB_CONN_MAX_AGE,
        ssl_require=DB_SSL_REQUIRE,
    )
}

# =========================
# Internacionalización
# =========================
LANGUAGE_CODE = config('LANGUAGE_CODE', default='en-us')
TIME_ZONE = config('TIME_ZONE', default='UTC')
USE_I18N = True
USE_TZ = True

# =========================
# Archivos estáticos
# =========================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =========================
# Celery / Redis
# =========================
# REDIS_URL puede venir como rediss:// en Render u otros; normalizamos a redis://
REDIS_URL = config("REDIS_URL", default="redis://redis:6379/0").replace("rediss://", "redis://")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'


S3_PLANS_BUCKET = os.environ.get("S3_PLANS_BUCKET", "")
