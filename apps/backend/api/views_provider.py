from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .providers import list_provider_capabilities


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_capabilities_view(_request):
    return Response(list_provider_capabilities())
