# apps/backend/teg/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def healthz(_):
    return JsonResponse({"status": "ok", "marker": "v3"})

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("healthz/", healthz),
]
