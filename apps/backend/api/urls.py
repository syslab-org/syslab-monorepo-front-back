# apps/backend/api/urls.py
from django.urls import path, re_path
from .views import run_prueba, task_status, network_plan_create

urlpatterns = [
    path("tasks/run/", run_prueba, name="run_prueba"),
    path("tasks/status/<str:task_id>/", task_status, name="task_status"),
    path("network/plan/", network_plan_create, name="network_plan"),  # ← con slash final

    # (opcional) acepta también sin slash:
    # re_path(r"^network/plan/?$", network_plan_create, name="network_plan"),
]
