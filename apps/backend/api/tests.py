from django.test import SimpleTestCase

from .tasks import build_nat_cleanup_targets
from .validators import validate_network_plan


class ValidateNetworkPlanTests(SimpleTestCase):
    def test_keeps_allowed_ssh_cidr_and_subnet_public_ip_flag(self):
        payload = {
            "name": "lab-nat",
            "cloud": "aws",
            "vpcs": [
                {
                    "id": "vpc-a",
                    "name": "VPC-A",
                    "region": "us-east-1",
                    "cidr_block": "10.30.0.0/16",
                    "internet_gateway": True,
                    "allowed_ssh_cidr": "203.0.113.10/32",
                    "nat_gateway": {
                        "enabled": True,
                        "public_subnet": "public-a1",
                        "elastic_ip": "",
                    },
                    "route_tables": [
                        {
                            "name": "public",
                            "routes": [
                                {
                                    "name": "igw-default",
                                    "dest_cidr": "0.0.0.0/0",
                                    "target": "igw",
                                }
                            ],
                        }
                    ],
                    "subnets": [
                        {
                            "name": "public-a1",
                            "cidr_block": "10.30.1.0/24",
                            "availability_zone": "us-east-1a",
                            "subnet_type": "public",
                            "map_public_ip_on_launch": True,
                            "route_table": "public",
                            "instances": [],
                        }
                    ],
                }
            ],
        }

        sanitized = validate_network_plan(payload)
        vpc = sanitized["vpcs"][0]

        self.assertEqual(vpc["allowed_ssh_cidr"], "203.0.113.10/32")
        self.assertTrue(vpc["subnets"][0]["map_public_ip_on_launch"])

    def test_rejects_non_allocation_id_nat_elastic_ip(self):
        payload = {
            "name": "lab-nat",
            "cloud": "aws",
            "vpcs": [
                {
                    "id": "vpc-a",
                    "name": "VPC-A",
                    "region": "us-east-1",
                    "cidr_block": "10.30.0.0/16",
                    "nat_gateway": {
                        "enabled": True,
                        "public_subnet": "public-a1",
                        "elastic_ip": "198.51.100.10",
                    },
                    "route_tables": [],
                    "subnets": [
                        {
                            "name": "public-a1",
                            "cidr_block": "10.30.1.0/24",
                            "availability_zone": "us-east-1a",
                            "subnet_type": "public",
                            "map_public_ip_on_launch": True,
                            "route_table": "public",
                            "instances": [],
                        }
                    ],
                }
            ],
        }

        with self.assertRaisesMessage(
            ValueError,
            "Elastic IP must be an allocation ID",
        ):
            validate_network_plan(payload)


class NatCleanupTargetTests(SimpleTestCase):
    def test_build_nat_cleanup_targets_marks_generated_eip_as_releasable(self):
        payload = {
            "vpcs": [
                {
                    "id": "vpc-a",
                    "nat_gateway": {
                        "enabled": True,
                        "elastic_ip": "",
                    },
                }
            ]
        }
        outputs = {"vpc_ids": {"vpc-a": "vpc-123"}}

        targets = build_nat_cleanup_targets(payload, outputs)

        self.assertEqual(
            targets,
            {
                "vpc-123": {
                    "logical_vpc_id": "vpc-a",
                    "release_generated_eip": True,
                    "provided_eip": "",
                }
            },
        )

    def test_build_nat_cleanup_targets_preserves_provided_eip(self):
        payload = {
            "vpcs": [
                {
                    "id": "vpc-a",
                    "nat_gateway": {
                        "enabled": True,
                        "elastic_ip": "eipalloc-0abc123def4567890",
                    },
                }
            ]
        }
        outputs = {"vpc_ids": {"vpc-a": "vpc-123"}}

        targets = build_nat_cleanup_targets(payload, outputs)

        self.assertEqual(
            targets["vpc-123"]["provided_eip"],
            "eipalloc-0abc123def4567890",
        )
        self.assertFalse(targets["vpc-123"]["release_generated_eip"])
