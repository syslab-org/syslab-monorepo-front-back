from django.urls import include, path
from rest_framework import routers
from . import views

router = routers.DefaultRouter()
# router.register(r'group',       views.GroupViewSet)
# router.register(r'user',        views.UserViewSet)
# router.register(r'cloud',       views.CloudViewSet)
# router.register(r'component',   views.ComponentViewSet, basename='Component')

ALLOWED_METHODS_ALL = {
            'post': 'create',
            'get': 'get'
        }

ONLY_GET = {'get': 'get'}
ONLY_POST = {'post': 'create'}

#Endpoints
networks = path('network/', views.NetworkViewSet.as_view(ALLOWED_METHODS_ALL))

network = network = path('network/<int:pk>/', views.NetworkViewSet.as_view(ONLY_GET))

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    networks,
    network
]