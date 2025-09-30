# apps/backend/api/validators.py

def validate_network_plan(payload: dict):
    """
    Valida la estructura mínima de un plan de red.
    Requiere que el payload incluya:
      - name, region, vpc, subnets
      - vpc con cidr
      - subnets con name, cidr, az, public
      - rutas opcionales con from_subnet, to, via
    """

    # claves top obligatorias
    required_top = ["name", "region", "vpc", "subnets"]
    for k in required_top:
        if k not in payload:
            raise ValueError(f"Falta clave requerida: {k}")

    # validación de la VPC
    vpc = payload["vpc"]
    if not isinstance(vpc, dict):
        raise ValueError("vpc debe ser un objeto")
    if "cidr" not in vpc:
        raise ValueError("vpc.cidr requerido")
    if "name" not in vpc:
        raise ValueError("vpc.name requerido")

    # validación de subnets
    subnets = payload["subnets"]
    if not isinstance(subnets, list) or not subnets:
        raise ValueError("subnets debe ser lista no vacía")

    seen_names = set()
    for s in subnets:
        for k in ["name", "cidr", "az", "public"]:
            if k not in s:
                raise ValueError(f"subnet.{k} requerido en {s}")
        if s["name"] in seen_names:
            raise ValueError(f"Nombre de subnet duplicado: {s['name']}")
        seen_names.add(s["name"])

    # validación opcional de rutas
    for r in payload.get("routes", []):
        for k in ["from_subnet", "to", "via"]:
            if k not in r:
                raise ValueError(f"route.{k} requerido en {r}")

    return True
