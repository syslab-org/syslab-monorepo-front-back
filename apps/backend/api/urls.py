# apps/backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ping,
    run_prueba,
    task_status,
    network_plan_create,
    deploy_plan,
    destroy_plan,
    destroy_last_plan,
)
from .views_plans import PlanViewSet

router = DefaultRouter()
router.register(r"network/plans", PlanViewSet, basename="network-plans")

urlpatterns = [
    # Celery demo + crear plan
    path("tasks/run/", run_prueba, name="run_prueba"),
    path("tasks/status/<str:task_id>/", task_status, name="task_status"),
    path("network/plan/", network_plan_create, name="network_plan"),
    path("network/plans/<uuid:plan_id>/deploy/", deploy_plan, name="deploy-plan"),
    # NUEVO: destroy por id y "destroy-last"
    path("network/plans/<uuid:plan_id>/destroy/", destroy_plan, name="destroy-plan"),
    path("network/plans/destroy-last/", destroy_last_plan, name="destroy-last"),
    # ViewSet (list/detalle/payload)
    path("ping/", ping, name="ping"),
    path("", include(router.urls)),
]
