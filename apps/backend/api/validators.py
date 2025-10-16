# apps/backend/api/validators.py
from .serializers import MultiPlanSerializer

def _req(d, key, typ=None, where=""):
    if key not in d:
        raise ValueError(f"Falta clave requerida{f' en {where}' if where else ''}: {key}")
    if typ and not isinstance(d[key], typ):
        raise ValueError(f"Clave '{key}' debe ser de tipo {typ.__name__}")
    return d[key]

def validate_network_plan(payload: dict) -> dict:
    """
    Valida el payload multi-VPC del front con DRF serializers.
    - Exige 'name' (para el Plan).
    - Valida estructura (vlan/vpcs/links).
    - Normaliza región de VPCs heredando de vlan.region si alguna viene vacía.
    Devuelve el payload saneado (serializer.validated_data + name).
    Lanza ValueError con mensaje claro si falla.
    """
    if not isinstance(payload, dict):
        raise ValueError("Payload inválido: debe ser un objeto JSON.")

    # 1) nombre del plan
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValueError("Falta clave requerida: name")

    # 2) validación estructural
    ser = MultiPlanSerializer(data=payload)
    if not ser.is_valid():
        # construimos mensaje amigable
        errs = []
        for k, v in ser.errors.items():
            errs.append(f"{k}: {v}")
        msg = "; ".join(errs) or "Payload inválido"
        raise ValueError(msg)

    data = ser.validated_data

    # 3) region por defecto: hereda de vlan.region si alguna vpc no trae
    vlan_region = (data.get("vlan") or {}).get("region")
    if vlan_region:
        for v in data.get("vpcs", []):
            if not v.get("region"):
                v["region"] = vlan_region

    # 4) master_cidr puede ser vacío (no lo apretamos aquí)

    # 5) devolvemos saneado + name
    data_out = dict(data)
    data_out["name"] = name
    return data_out
