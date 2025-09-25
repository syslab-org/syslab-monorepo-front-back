# apps/backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import run_prueba, task_status, network_plan_create
from .views_plans import PlanViewSet

router = DefaultRouter()
router.register(r"network/plans", PlanViewSet, basename='network-plans')

urlpatterns = [
     # Celery demo + crear plan
    path("tasks/run/", run_prueba, name="run_prueba"),
    path("tasks/status/<str:task_id>/", task_status, name="task_status"),
    path("network/plan/", network_plan_create, name="network_plan"),  # POST (crear + Celery)

   # Listado/detalle/payload de planes
    path("", include(router.urls)),  # ← añade las rutas del ViewSet

]
