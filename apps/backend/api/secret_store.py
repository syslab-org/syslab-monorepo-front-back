import base64
import hashlib
import os

from cryptography.fernet import Fernet
from django.conf import settings


def _build_fernet() -> Fernet:
    raw_key = os.getenv("CLOUD_CONNECTIONS_ENCRYPTION_KEY", "").strip()
    if raw_key:
        key = raw_key.encode("utf-8")
    else:
        digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    return _build_fernet().encrypt(raw.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: str) -> str:
    token = str(value or "").strip()
    if not token:
        return ""
    return _build_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
