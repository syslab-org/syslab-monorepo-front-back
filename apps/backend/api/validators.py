# apps/backend/api/validators.py
def validate_network_plan(payload: dict):
    required_top = ["name", "region", "vpc", "subnets"]
    for k in required_top:
        if k not in payload:
            raise ValueError(f"Falta clave requerida: {k}")

    vpc = payload["vpc"]
    if "cidr" not in vpc:
        raise ValueError("vpc.cidr requerido")

    subnets = payload["subnets"]
    if not isinstance(subnets, list) or not subnets:
        raise ValueError("subnets debe ser lista no vacía")
    names = set()
    for s in subnets:
        for k in ["name", "cidr", "az", "public"]:
            if k not in s:
                raise ValueError(f"subnet.{k} requerido en {s}")
        if s["name"] in names:
            raise ValueError(f"Nombre de subnet duplicado: {s['name']}")
        names.add(s["name"])

    # Opcional: validar routes
    for r in payload.get("routes", []):
        for k in ["from_subnet", "to", "via"]:
            if k not in r:
                raise ValueError(f"route.{k} requerido en {r}")

    return True
