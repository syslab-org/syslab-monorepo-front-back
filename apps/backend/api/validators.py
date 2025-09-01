import ipaddress

def _is_cidr(value: str) -> bool:
    try:
        ipaddress.ip_network(value, strict=True)
        return True
    except Exception:
        return False

def _subnet_in_vpc(subnet_cidr: str, vpc_cidr: str) -> bool:
    sn = ipaddress.ip_network(subnet_cidr, strict=True)
    vpc = ipaddress.ip_network(vpc_cidr, strict=True)
    return sn.subnet_of(vpc)

def validate_network_plan(plan: dict) -> None:
    if not isinstance(plan, dict):
        raise ValueError("El plan debe ser un objeto JSON")
    if not plan.get("name"):
        raise ValueError("name es requerido")

    vpcs = plan.get("vpcs")
    if not isinstance(vpcs, list) or not vpcs:
        raise ValueError("vpcs debe ser lista no vacía")

    vpc_names = set()
    for v in vpcs:
        v_name, v_cidr = v.get("name"), v.get("cidr_block")
        if not v_name or not v_cidr:
            raise ValueError("Cada VPC requiere name y cidr_block")
        if v_name in vpc_names:
            raise ValueError(f"Nombre de VPC duplicado: {v_name}")
        vpc_names.add(v_name)
        if not _is_cidr(v_cidr):
            raise ValueError(f"CIDR inválido en VPC {v_name}")

        for s in v.get("subnets", []):
            s_name, s_cidr = s.get("name"), s.get("cidr_block")
            if not s_name or not s_cidr:
                raise ValueError(f"Subnet en VPC {v_name} requiere name y cidr_block")
            if not _is_cidr(s_cidr):
                raise ValueError(f"CIDR inválido en subnet {s_name}")
            if not _subnet_in_vpc(s_cidr, v_cidr):
                raise ValueError(f"Subnet {s_name} ({s_cidr}) no está contenida en {v_name} ({v_cidr})")
