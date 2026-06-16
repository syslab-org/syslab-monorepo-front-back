from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

from intent_plugin.exceptions import IntentPluginDisabled, IntentProviderConfigurationError
from intent_plugin.serializers import IntentGenerateRequestSerializer, IntentGenerateResponseSerializer
from intent_plugin.service import generate_intent, get_manifest


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def intent_manifest_view(_request):
    try:
        payload = get_manifest()
    except IntentProviderConfigurationError as exc:
        return Response({"ok": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(payload)


class IntentGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = IntentGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = generate_intent(serializer.validated_data)
        except IntentPluginDisabled as exc:
            return Response({"ok": False, "error": str(exc)}, status=status.HTTP_409_CONFLICT)
        except IntentProviderConfigurationError as exc:
            return Response({"ok": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        out = IntentGenerateResponseSerializer(payload)
        return Response(out.data, status=status.HTTP_200_OK)
