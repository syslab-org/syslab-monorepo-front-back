# apps/backend/teg/urls.py
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.views.static import serve as serve_static

def healthz(_):
    return JsonResponse({"status": "ok", "marker": "v3"})

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("healthz/", healthz),
    re_path(
        r"^media/(?P<path>.*)$",
        serve_static,
        {"document_root": settings.MEDIA_ROOT},
    ),
]
