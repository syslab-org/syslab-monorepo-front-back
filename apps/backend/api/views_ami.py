from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AmiCatalogEntry
from .permissions import is_platform_admin, is_teacher
from .serializers import AmiCatalogEntrySerializer


class AmiCatalogViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = AmiCatalogEntry.objects.all()
        provider = request.query_params.get("provider")
        if provider:
            qs = qs.filter(provider=provider)
        region = request.query_params.get("region")
        if region:
            qs = qs.filter(region=region)
        return Response(AmiCatalogEntrySerializer(qs, many=True).data)

    def create(self, request):
        if not (is_platform_admin(request.user) or is_teacher(request.user)):
            return Response({"detail": "Solo admin o docente pueden gestionar AMIs."}, status=status.HTTP_403_FORBIDDEN)
        serializer = AmiCatalogEntrySerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(created_by=request.user)
        return Response(AmiCatalogEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        if not (is_platform_admin(request.user) or is_teacher(request.user)):
            return Response({"detail": "Solo admin o docente pueden gestionar AMIs."}, status=status.HTTP_403_FORBIDDEN)
        AmiCatalogEntry.objects.filter(id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
