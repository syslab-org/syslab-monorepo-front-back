from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .i18n import tr
from .models import ROLE_PLATFORM_ADMIN, STATUS_ACTIVE, STATUS_DEACTIVATED, UserProfile
from .permissions import canonical_role, is_platform_admin
from .serializers import (
    EmailLoginSerializer,
    GoogleLoginSerializer,
    MeSerializer,
    ProfileUpdateSerializer,
    RegistrationSerializer,
)



def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()



def _get_user_by_email(email: str):
    return User.objects.filter(email__iexact=_normalize_email(email)).select_related("profile").first()



def _ensure_active_profile(user: User):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if user.is_superuser and profile.role != ROLE_PLATFORM_ADMIN:
        profile.role = ROLE_PLATFORM_ADMIN
        profile.status = STATUS_ACTIVE
        profile.save(update_fields=["role", "status", "updated_at"])
    return profile



def _build_auth_payload(user: User):
    profile = _ensure_active_profile(user)
    token, _ = Token.objects.get_or_create(user=user)
    return {
        "token": token.key,
        "user": MeSerializer(user).data,
        "role": canonical_role(user),
        "status": profile.status,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login_with_email(request):
    serializer = EmailLoginSerializer(data=request.data or {})
    serializer.is_valid(raise_exception=True)

    email = _normalize_email(serializer.validated_data["email"])
    password = serializer.validated_data["password"]

    user = _get_user_by_email(email)
    if not user:
        return Response({"detail": tr("invalid_credentials", request=request)}, status=status.HTTP_400_BAD_REQUEST)

    auth_user = authenticate(username=user.username, password=password)
    if not auth_user:
        return Response({"detail": tr("invalid_credentials", request=request)}, status=status.HTTP_400_BAD_REQUEST)

    profile = _ensure_active_profile(auth_user)
    if profile.status != STATUS_ACTIVE:
        return Response({"detail": tr("account_not_active", request=request)}, status=status.HTTP_403_FORBIDDEN)

    return Response(_build_auth_payload(auth_user))


@api_view(["POST"])
@permission_classes([AllowAny])
def login_with_google(request):
    serializer = GoogleLoginSerializer(data=request.data or {})
    serializer.is_valid(raise_exception=True)

    client_id = request.data.get("client_id") or request.META.get("HTTP_X_GOOGLE_CLIENT_ID") or ""
    if not client_id:
        client_id = request.query_params.get("client_id", "")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except Exception:
        return Response(
            {"detail": tr("google_login_not_configured", request=request)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        payload = id_token.verify_oauth2_token(
            serializer.validated_data["credential"],
            google_requests.Request(),
            audience=client_id or None,
        )
    except Exception as exc:
        return Response(
            {"detail": tr("google_token_invalid", request=request, error=exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = _normalize_email(payload.get("email"))
    if not email:
        return Response({"detail": tr("google_token_missing_email", request=request)}, status=status.HTTP_400_BAD_REQUEST)

    user = _get_user_by_email(email)
    if not user:
        return Response({"detail": tr("invited_account_not_found", request=request)}, status=status.HTTP_404_NOT_FOUND)

    profile = _ensure_active_profile(user)
    if profile.status == STATUS_DEACTIVATED:
        return Response({"detail": tr("account_deactivated", request=request)}, status=status.HTTP_403_FORBIDDEN)
    if profile.status != STATUS_ACTIVE:
        return Response({"detail": tr("account_not_yet_active", request=request)}, status=status.HTTP_403_FORBIDDEN)

    profile.google_sub = str(payload.get("sub") or "")
    profile.photo_url = str(payload.get("picture") or profile.photo_url or "")
    profile.save(update_fields=["google_sub", "photo_url", "updated_at"])

    if payload.get("given_name") and not user.first_name:
        user.first_name = payload.get("given_name", "")
    if payload.get("family_name") and not user.last_name:
        user.last_name = payload.get("family_name", "")
    if payload.get("name") and not user.first_name and not user.last_name:
        user.first_name = payload.get("name", "")
    user.save(update_fields=["first_name", "last_name"])

    return Response(_build_auth_payload(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"ok": True})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me_view(request):
    if request.method == "GET":
        return Response(MeSerializer(request.user).data)

    serializer = ProfileUpdateSerializer(data=request.data or {})
    serializer.is_valid(raise_exception=True)

    user = request.user
    profile = _ensure_active_profile(user)
    data = serializer.validated_data

    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "email" in data:
        normalized_email = _normalize_email(data["email"])
        if User.objects.exclude(id=user.id).filter(email__iexact=normalized_email).exists():
            return Response({"detail": tr("email_already_in_use", request=request)}, status=status.HTTP_400_BAD_REQUEST)
        user.email = normalized_email
        user.username = normalized_email
    user.save(update_fields=["first_name", "last_name", "email", "username"])

    profile_updates = []
    if "photo_url" in data:
        profile.photo_url = data["photo_url"]
        profile_updates.append("photo_url")
    if "settings" in data:
        current = profile.settings if isinstance(profile.settings, dict) else {}
        current.update(data["settings"] or {})
        profile.settings = current
        profile_updates.append("settings")
    if profile_updates:
        profile_updates.append("updated_at")
        profile.save(update_fields=profile_updates)

    return Response(MeSerializer(user).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def registration_view(request, invite_token):
    profile = UserProfile.objects.select_related("user").filter(invite_token=invite_token).first()
    if not profile or not profile.is_invitation_valid():
        return Response({"detail": tr("invalid_invitation", request=request)}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(
            {
                "email": profile.user.email,
                "role": profile.canonical_role,
                "status": profile.status,
                "expires_at": profile.invitation_expires_at.isoformat() if profile.invitation_expires_at else None,
            }
        )

    serializer = RegistrationSerializer(data=request.data or {})
    serializer.is_valid(raise_exception=True)

    email = _normalize_email(serializer.validated_data["email"])
    if email != _normalize_email(profile.user.email):
        return Response({"detail": tr("invitation_email_mismatch", request=request)}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = profile.user
        user.email = email
        user.username = email
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["email", "username", "password"])

        profile.status = STATUS_ACTIVE
        profile.invite_token = None
        profile.invitation_expires_at = None
        profile.save(update_fields=["status", "invite_token", "invitation_expires_at", "updated_at"])

    return Response(_build_auth_payload(profile.user), status=status.HTTP_201_CREATED)
