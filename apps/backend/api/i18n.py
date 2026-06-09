SUPPORTED_LANGUAGES = ("es", "en")
DEFAULT_LANGUAGE = "es"


MESSAGES = {
    "account_deactivated": {
        "es": "La cuenta está desactivada.",
        "en": "The account is deactivated.",
    },
    "account_not_active": {
        "es": "Tu cuenta no está activa.",
        "en": "Your account is not active.",
    },
    "account_not_yet_active": {
        "es": "La cuenta aún no está activa. Completa el registro con el equipo administrador.",
        "en": "The account is not active yet. Complete registration with the admin team.",
    },
    "email_already_in_use": {
        "es": "Ese email ya está en uso.",
        "en": "That email is already in use.",
    },
    "google_login_not_configured": {
        "es": "El inicio de sesión con Google no está configurado en el servidor.",
        "en": "Google login is not configured on the server.",
    },
    "google_token_invalid": {
        "es": "Token de Google inválido: {error}",
        "en": "Invalid Google token: {error}",
    },
    "google_token_missing_email": {
        "es": "El token de Google no trae email.",
        "en": "Google token has no email.",
    },
    "invalid_credentials": {
        "es": "Credenciales inválidas.",
        "en": "Invalid credentials.",
    },
    "invalid_invitation": {
        "es": "La invitación es inválida o ya expiró.",
        "en": "The invitation is invalid or has already expired.",
    },
    "invited_account_not_found": {
        "es": "No existe una cuenta invitada para este email.",
        "en": "There is no invited account for this email.",
    },
    "invitation_email_mismatch": {
        "es": "El email no coincide con la invitación.",
        "en": "The email does not match the invitation.",
    },
    "missing_canvas_id": {
        "es": "canvas_id es requerido para mantener 1 Canvas = 1 Plan.",
        "en": "canvas_id is required to keep 1 Canvas = 1 Plan.",
    },
    "missing_canvas_id_short": {
        "es": "canvas_id es requerido.",
        "en": "canvas_id is required.",
    },
    "missing_name": {
        "es": "Falta clave requerida: name",
        "en": "Missing required key: name",
    },
    "payload_invalid_object": {
        "es": "Payload inválido: debe ser un objeto JSON.",
        "en": "Invalid payload: it must be a JSON object.",
    },
    "plan_not_found": {
        "es": "Plan no encontrado",
        "en": "Plan not found",
    },
    "task_not_found": {
        "es": "Tarea no encontrada.",
        "en": "Task not found.",
    },
}


def normalize_language(value) -> str:
    lowered = str(value or "").strip().lower()

    if lowered.startswith("en"):
        return "en"

    if lowered.startswith("es"):
        return "es"

    return DEFAULT_LANGUAGE


def get_request_language(request=None, language=None) -> str:
    if language:
        return normalize_language(language)

    if request is None:
        return DEFAULT_LANGUAGE

    language_code = getattr(request, "LANGUAGE_CODE", "") or ""
    if language_code:
        return normalize_language(language_code)

    header = ""
    if hasattr(request, "META"):
        header = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    if header:
        return normalize_language(header.split(",")[0])

    return DEFAULT_LANGUAGE


def tr(key: str, *, request=None, language=None, **kwargs) -> str:
    normalized = get_request_language(request=request, language=language)
    variants = MESSAGES.get(key, {})
    template = variants.get(normalized) or variants.get(DEFAULT_LANGUAGE) or key
    return template.format(**kwargs)
