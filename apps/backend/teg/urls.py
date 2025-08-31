# apps/backend/teg/urls.py
from django.urls import path, include
from django.http import JsonResponse
import os

def healthz(_):
    return JsonResponse({"status": "ok", "marker": "v3"})

urlpatterns = [
    path("api/", include("api.urls")),
    path("healthz/", healthz),
]
