#!/usr/bin/env python3
"""Upload generated canvas flows into Firestore (collection: vpcs).

Auth strategy:
- Firebase email/password sign-in via Identity Toolkit API.
- Uses the returned ID token to call Firestore REST API.

Typical usage:
  FIREBASE_EMAIL="user@example.com" FIREBASE_PASSWORD="***" \
  ./scripts/upload_canvas_flows_firestore.py --dry-run

  FIREBASE_EMAIL="user@example.com" FIREBASE_PASSWORD="***" \
  ./scripts/upload_canvas_flows_firestore.py --overwrite --user-id <USER_DOC_ID>
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib import error, parse, request


DEFAULT_FIREBASE_API_KEY = ""
DEFAULT_PROJECT_ID = "syslab-vite"
DEFAULT_COLLECTION = "vpcs"


class ApiError(RuntimeError):
    """HTTP/JSON API error with status and response details."""

    def __init__(self, message: str, status: Optional[int] = None, body: str = ""):
        super().__init__(message)
        self.status = status
        self.body = body


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload generated canvas flow JSON files to Firestore.",
    )
    parser.add_argument(
        "--input-dir",
        default="apps/frontend/examples/network-scenarios/generated-canvas",
        help="Directory containing *.canvas.json files.",
    )
    parser.add_argument(
        "--scenario-dir",
        default="apps/frontend/examples/network-scenarios",
        help="Directory with original source scenarios (0*.json).",
    )
    parser.add_argument(
        "--pattern",
        default="*.canvas.json",
        help="Glob pattern for input files.",
    )
    parser.add_argument(
        "--project-id",
        default=DEFAULT_PROJECT_ID,
        help="Firebase project ID.",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Firebase Web API key (Identity Toolkit). If omitted, reads FIREBASE_API_KEY.",
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help="Firestore collection to write documents into.",
    )
    parser.add_argument(
        "--email",
        default=None,
        help="Firebase account email. If omitted, reads FIREBASE_EMAIL.",
    )
    parser.add_argument(
        "--password",
        default=None,
        help="Firebase account password. If omitted, reads FIREBASE_PASSWORD.",
    )
    parser.add_argument(
        "--id-prefix",
        default="seed-canvas",
        help="Prefix for generated Firestore document IDs.",
    )
    parser.add_argument(
        "--user-id",
        default=None,
        help="Optional users/{id} owner to set in each vpc doc (important for student filtering).",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite docs if they already exist.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions only; do not call Firebase APIs.",
    )
    return parser.parse_args()


def env_value(name: str) -> str:
    import os

    return str(os.getenv(name, "")).strip()


def slugify(value: str) -> str:
    out = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip())
    return out.strip("-") or "item"


def parse_cidr(cidr: str) -> Tuple[str, int]:
    if "/" not in str(cidr):
        return (str(cidr or "10.0.0.0"), 16)
    base, prefix = str(cidr).split("/", 1)
    try:
        pref = int(prefix)
    except ValueError:
        pref = 16
    return (base.strip() or "10.0.0.0", pref)


def read_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def http_json(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    final_headers = {"Accept": "application/json"}
    if headers:
        final_headers.update(headers)

    body_bytes = None
    if payload is not None:
        body_bytes = json.dumps(payload).encode("utf-8")
        final_headers["Content-Type"] = "application/json"

    req = request.Request(url, method=method, headers=final_headers, data=body_bytes)
    try:
        with request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8") if resp else ""
            return json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8") if exc.fp else ""
        raise ApiError(
            f"{method} {url} failed with HTTP {exc.code}",
            status=exc.code,
            body=raw,
        ) from exc
    except error.URLError as exc:
        raise ApiError(f"{method} {url} failed: {exc}") from exc


def firebase_sign_in(api_key: str, email: str, password: str) -> Dict[str, Any]:
    sign_in_url = (
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
        f"?key={parse.quote(api_key)}"
    )
    return http_json(
        sign_in_url,
        method="POST",
        payload={
            "email": email,
            "password": password,
            "returnSecureToken": True,
        },
    )


def firestore_document_url(project_id: str, collection: str, doc_id: str) -> str:
    quoted_collection = parse.quote(collection, safe="")
    quoted_doc = parse.quote(doc_id, safe="")
    return (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        f"/databases/(default)/documents/{quoted_collection}/{quoted_doc}"
    )


def firestore_get_document(
    project_id: str,
    collection: str,
    doc_id: str,
    id_token: str,
) -> Optional[Dict[str, Any]]:
    url = firestore_document_url(project_id, collection, doc_id)
    try:
        return http_json(
            url,
            method="GET",
            headers={"Authorization": f"Bearer {id_token}"},
        )
    except ApiError as exc:
        if exc.status == 404:
            return None
        raise


def to_firestore_value(value: Any) -> Dict[str, Any]:
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, datetime):
        iso = value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        return {"timestampValue": iso}
    if isinstance(value, str):
        return {"stringValue": value}
    if isinstance(value, list):
        if not value:
            return {"arrayValue": {}}
        return {"arrayValue": {"values": [to_firestore_value(v) for v in value]}}
    if isinstance(value, dict):
        fields = {k: to_firestore_value(v) for k, v in value.items()}
        return {"mapValue": {"fields": fields}}
    return {"stringValue": str(value)}


def to_firestore_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    return {k: to_firestore_value(v) for k, v in data.items()}


def firestore_patch_document(
    project_id: str,
    collection: str,
    doc_id: str,
    id_token: str,
    data: Dict[str, Any],
    update_fields: Iterable[str],
    exists_precondition: Optional[bool] = None,
) -> Dict[str, Any]:
    url = firestore_document_url(project_id, collection, doc_id)
    query: List[Tuple[str, str]] = []
    for field_path in update_fields:
        query.append(("updateMask.fieldPaths", field_path))
    if exists_precondition is not None:
        query.append(
            (
                "currentDocument.exists",
                "true" if exists_precondition else "false",
            )
        )
    if query:
        url = f"{url}?{parse.urlencode(query, doseq=True)}"

    return http_json(
        url,
        method="PATCH",
        headers={"Authorization": f"Bearer {id_token}"},
        payload={"fields": to_firestore_fields(data)},
    )


def load_scenario_for_flow(flow: Dict[str, Any], scenario_dir: Path, flow_path: Path) -> Dict[str, Any]:
    meta = flow.get("meta") if isinstance(flow.get("meta"), dict) else {}
    from_meta = str(meta.get("generated_from") or "").strip()
    if from_meta:
        candidate = scenario_dir / from_meta
        if candidate.exists():
            return read_json(candidate)

    stem = flow_path.name.replace(".canvas.json", "")
    fallback = scenario_dir / f"{stem}.json"
    if fallback.exists():
        return read_json(fallback)

    return {}


def build_doc_payload(
    flow: Dict[str, Any],
    scenario: Dict[str, Any],
    user_id: Optional[str] = None,
    include_created_at: bool = True,
) -> Dict[str, Any]:
    vlan = scenario.get("vlan") if isinstance(scenario.get("vlan"), dict) else {}
    master_cidr = str(vlan.get("master_cidr") or "10.0.0.0/16")
    cidr_base, prefix_length = parse_cidr(master_cidr)
    now = datetime.now(timezone.utc)

    payload: Dict[str, Any] = {
        "name": str(vlan.get("name") or scenario.get("name") or flow.get("meta", {}).get("scenario_name") or "lab-generated"),
        "cloudProvider": str(scenario.get("cloud") or "aws").lower(),
        "cidrBlock": cidr_base,
        "prefixLength": prefix_length,
        "region": str(vlan.get("region") or "us-east-1"),
        "type": "vlan",
        "narrative": "advanced",
        "flow": flow,
        "updatedAt": now,
        "sourceScenario": str(flow.get("meta", {}).get("generated_from") or ""),
        "generatedBy": "upload_canvas_flows_firestore.py",
    }
    if include_created_at:
        payload["createdAt"] = now
    if user_id:
        payload["userId"] = user_id
    return payload


def main() -> int:
    args = parse_args()

    input_dir = Path(args.input_dir)
    scenario_dir = Path(args.scenario_dir)

    if not input_dir.exists():
        raise SystemExit(f"Input directory does not exist: {input_dir}")

    files = sorted(input_dir.glob(args.pattern))
    files = [f for f in files if f.name != "index.canvas.json"]
    if not files:
        raise SystemExit(f"No files matched pattern '{args.pattern}' in {input_dir}")

    api_key = str(args.api_key or env_value("FIREBASE_API_KEY") or DEFAULT_FIREBASE_API_KEY).strip()
    email = (args.email or env_value("FIREBASE_EMAIL")).strip()
    password = (args.password or env_value("FIREBASE_PASSWORD")).strip()

    id_token = ""
    if not args.dry_run:
        if not api_key:
            raise SystemExit(
                "FIREBASE_API_KEY (or --api-key) is required unless --dry-run is used."
            )
        if not email or not password:
            raise SystemExit(
                "FIREBASE_EMAIL/FIREBASE_PASSWORD (or --email/--password) are required unless --dry-run is used."
            )
        sign_in = firebase_sign_in(api_key, email, password)
        id_token = str(sign_in.get("idToken") or "")
        if not id_token:
            raise SystemExit("Firebase sign-in succeeded but did not return idToken.")
        print(f"Authenticated as: {sign_in.get('email') or email}")

    created = 0
    updated = 0
    skipped = 0

    for path in files:
        flow = read_json(path)
        scenario = load_scenario_for_flow(flow, scenario_dir, path)
        stem = path.name.replace(".canvas.json", "")
        doc_id = f"{args.id_prefix}-{slugify(stem)}"

        if args.dry_run:
            payload_preview = build_doc_payload(flow, scenario, user_id=args.user_id, include_created_at=True)
            print(
                f"[DRY-RUN] would upsert {args.collection}/{doc_id} "
                f"(name={payload_preview.get('name')}, nodes={len(flow.get('nodes', []))}, edges={len(flow.get('edges', []))})"
            )
            continue

        existing = firestore_get_document(
            project_id=args.project_id,
            collection=args.collection,
            doc_id=doc_id,
            id_token=id_token,
        )
        exists = existing is not None

        if exists and not args.overwrite:
            skipped += 1
            print(f"[SKIP] {args.collection}/{doc_id} already exists (use --overwrite)")
            continue

        include_created_at = not exists
        payload = build_doc_payload(
            flow,
            scenario,
            user_id=args.user_id,
            include_created_at=include_created_at,
        )

        firestore_patch_document(
            project_id=args.project_id,
            collection=args.collection,
            doc_id=doc_id,
            id_token=id_token,
            data=payload,
            update_fields=payload.keys(),
            exists_precondition=(True if exists else False),
        )

        if exists:
            updated += 1
            print(f"[UPDATE] {args.collection}/{doc_id}")
        else:
            created += 1
            print(f"[CREATE] {args.collection}/{doc_id}")

    print(
        f"Done. created={created} updated={updated} skipped={skipped} dry_run={args.dry_run}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
