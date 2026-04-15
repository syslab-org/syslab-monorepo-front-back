from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import login_with_email, login_with_google, logout_view, me_view, registration_view
from .views import (
    destroy_last_plan,
    destroy_plan,
    deploy_plan,
    network_plan_create,
    ping,
    run_prueba,
    task_status,
)
from .views_ami import AmiCatalogViewSet
from .views_courses import CourseViewSet
from .views_cloud_connections import CloudConnectionViewSet
from .views_execution_delegations import CloudExecutionDelegationViewSet
from .views_key_pairs import KeyPairCatalogViewSet
from .views_labs import LabViewSet
from .views_plans import PlanViewSet
from .views_provider import provider_capabilities_view
from .views_users import UserViewSet

router = DefaultRouter()
router.register(r"network/plans", PlanViewSet, basename="network-plans")
router.register(r"labs", LabViewSet, basename="labs")
router.register(r"courses", CourseViewSet, basename="courses")
router.register(r"users", UserViewSet, basename="users")
router.register(r"cloud-connections", CloudConnectionViewSet, basename="cloud-connections")
router.register(r"execution-delegations", CloudExecutionDelegationViewSet, basename="execution-delegations")
router.register(r"settings/amis", AmiCatalogViewSet, basename="ami-catalog")
router.register(r"settings/key-pairs", KeyPairCatalogViewSet, basename="key-pair-catalog")

urlpatterns = [
    path("auth/login/", login_with_email, name="auth-login"),
    path("auth/login/google/", login_with_google, name="auth-login-google"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/register/<uuid:invite_token>/", registration_view, name="auth-register"),
    path("me/", me_view, name="me"),
    path("providers/capabilities/", provider_capabilities_view, name="provider-capabilities"),
    path("tasks/run/", run_prueba, name="run_prueba"),
    path("tasks/status/<str:task_id>/", task_status, name="task_status"),
    path("network/plan/", network_plan_create, name="network_plan"),
    path("network/plans/<uuid:plan_id>/deploy/", deploy_plan, name="deploy-plan"),
    path("network/plans/<uuid:plan_id>/destroy/", destroy_plan, name="destroy-plan"),
    path("network/plans/destroy-last/", destroy_last_plan, name="destroy-last"),
    path("ping/", ping, name="ping"),
    path("", include(router.urls)),
]
