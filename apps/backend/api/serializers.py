# apps/backend/api/serializers.py
from rest_framework import serializers
from .models import Plan


class PlanListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ("id", "name", "status", "task_id", "created_at")
        read_only_fields = fields


class PlanDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "id",
            "name",
            "status",
            "task_id",
            "created_at",
            "payload",
            "error",
            "updated_at",
        )
        read_only_fields = fields


class SubnetSerializer(serializers.Serializer):
    name = serializers.CharField()
    cidr_block = serializers.CharField()
    availability_zone = serializers.CharField()
    subnet_type = serializers.CharField()  # "public" | "private"
    public_ip = serializers.BooleanField(required=False, default=False)
    route_table = serializers.CharField(required=False, default="main")
    instances = serializers.ListField(required=False)


class RouteSerializer(serializers.Serializer):
    dest_cidr = serializers.CharField()
    target = serializers.CharField()  # "local" | "router-<id>" (para peering)
    via_router_id = serializers.CharField(required=False, allow_null=True)


class RouteTableSerializer(serializers.Serializer):
    name = serializers.CharField()
    routes = RouteSerializer(many=True, required=False)


class NatGwSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(default=False)
    public_subnet = serializers.CharField(required=False, allow_blank=True, default="")
    elastic_ip = serializers.CharField(required=False, allow_blank=True, default="")


class VpcSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    region = serializers.CharField()
    cidr_block = serializers.CharField()
    internet_gateway = serializers.BooleanField(required=False, default=False)
    nat_gateway = NatGwSerializer(required=False)
    subnets = SubnetSerializer(many=True)
    route_tables = RouteTableSerializer(many=True, required=False)


class LinkRoutesDirSerializer(serializers.Serializer):
    a_to_b = RouteSerializer(many=True, required=False)
    b_to_a = RouteSerializer(many=True, required=False)


class LinkSerializer(serializers.Serializer):
    # Ahora aceptamos peering y tgw-attach
    type = serializers.ChoiceField(choices=["peering", "tgw-attach"])

    # --- Campos para PEERING ---
    via_router_id = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    vpc_a_id = serializers.CharField(required=False)
    vpc_b_id = serializers.CharField(required=False)

    # --- Campos para TGW-ATTACH ---
    router_id = serializers.CharField(required=False)
    vpc_id = serializers.CharField(required=False)
    subnet_names = serializers.ListField(child=serializers.CharField(), required=False)

    # --- Validación condicional ---
    def validate(self, data):
        t = data.get("type")

        if t == "peering":
            missing = [
                f for f in ("via_router_id", "vpc_a_id", "vpc_b_id") if not data.get(f)
            ]
            if missing:
                raise serializers.ValidationError(
                    {f: "This field is required for peering link" for f in missing}
                )

        elif t == "tgw-attach":
            missing = [
                f for f in ("router_id", "vpc_id", "subnet_names") if not data.get(f)
            ]
            if missing:
                raise serializers.ValidationError(
                    {f: "This field is required for tgw-attach link" for f in missing}
                )

        return data


class VlanSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, default="")
    region = serializers.CharField(required=False, allow_blank=True, default="")
    master_cidr = serializers.CharField(required=False, allow_blank=True, default="")


class MultiPlanSerializer(serializers.Serializer):
    cloud = serializers.ChoiceField(choices=["aws"])
    simulate_only = serializers.BooleanField(default=True)
    vlan = VlanSerializer(required=False)
    vpcs = VpcSerializer(many=True)
    links = LinkSerializer(many=True, required=False)
