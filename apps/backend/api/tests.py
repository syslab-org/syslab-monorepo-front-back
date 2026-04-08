from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from .domain.network_intent import normalize_network_intent
from .models import CLOUD_AUTH_AWS_ASSUME_ROLE, CLOUD_SCOPE_COURSE_SHARED, CLOUD_SCOPE_PERSONAL, CloudConnection, CloudExecutionDelegation, Course, Lab, Plan, PlanExecutionRecord, ROLE_PLATFORM_ADMIN, ROLE_STUDENT, ROLE_TEACHER, STATUS_ACTIVE, VISIBILITY_COURSE, VISIBILITY_OWNER
from .providers import get_provider_adapter, get_provider_executor
from .cloud_connections import build_aws_runtime_env
from .providers.aws.runtime import build_nat_cleanup_targets
from .providers.aws.terraform import render_workspace
from .secret_store import encrypt_secret
from .tasks import _build_last_apply_context
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


class NetworkIntentTests(SimpleTestCase):
    def test_normalize_network_intent_converts_legacy_payload_to_neutral_topology(self):
        payload = {
            "name": "Lab neutral",
            "cloud": "aws",
            "vlan": {
                "id": "canvas-1",
                "name": "Lab neutral",
                "region": "us-east-1",
                "master_cidr": "10.50.0.0/16",
            },
            "vpcs": [
                {
                    "id": "vpc-a",
                    "name": "VPC-A",
                    "region": "us-east-1",
                    "cidr_block": "10.50.0.0/16",
                    "internet_gateway": True,
                    "allowed_ssh_cidr": "203.0.113.5/32",
                    "nat_gateway": {"enabled": False, "public_subnet": "", "elastic_ip": ""},
                    "route_tables": [{"name": "public", "routes": [{"dest_cidr": "0.0.0.0/0", "target": "igw"}]}],
                    "subnets": [
                        {
                            "name": "public-a1",
                            "cidr_block": "10.50.1.0/24",
                            "availability_zone": "us-east-1a",
                            "subnet_type": "public",
                            "map_public_ip_on_launch": True,
                            "route_table": "public",
                            "instances": [
                                {
                                    "id": "vm-a1",
                                    "name": "bastion-a1",
                                    "ami": "ami-123",
                                    "instance_type": "t2.micro",
                                    "ip_address": "10.50.1.10",
                                    "ssh_access": "tesis-key",
                                    "associate_public_ip": True,
                                }
                            ],
                        }
                    ],
                }
            ],
            "links": [{"type": "peering", "vpc_a_id": "vpc-a", "vpc_b_id": "vpc-b", "via_router_id": "router-1"}],
            "routers": [],
        }

        intent = normalize_network_intent(payload)

        self.assertEqual(intent["metadata"]["source_format"], "legacy_aws_payload")
        self.assertEqual(intent["topology"]["network"]["id"], "canvas-1")
        self.assertEqual(intent["topology"]["segments"][0]["exposure"], "public")
        self.assertEqual(intent["topology"]["segments"][0]["workloads"][0]["access"]["ssh_key"], "tesis-key")
        self.assertEqual(intent["topology"]["connectivity"]["mode"], "direct")

    def test_aws_adapter_compiles_neutral_topology(self):
        adapter = get_provider_adapter("aws")
        neutral_payload = {
            "target_provider": "aws",
            "metadata": {
                "name": "Lab neutral compile",
                "canvas_id": "canvas-neutral-1",
            },
            "topology": {
                "network": {
                    "id": "canvas-neutral-1",
                    "name": "Lab neutral compile",
                    "region": "us-east-1",
                    "cidr": "10.70.0.0/16",
                },
                "segments": [
                    {
                        "id": "segment-a",
                        "name": "Segment A",
                        "region": "us-east-1",
                        "cidr": "10.70.0.0/16",
                        "ingress": {"ssh_cidr": "203.0.113.5/32"},
                        "zones": [
                            {
                                "id": "zone-a1",
                                "name": "public-a1",
                                "cidr": "10.70.1.0/24",
                                "kind": "public",
                                "availability_zone": "us-east-1a",
                                "map_public_ip_on_launch": True,
                                "workloads": [
                                    {
                                        "id": "workload-a1",
                                        "name": "bastion-a1",
                                        "image": "ami-123",
                                        "size": "t2.micro",
                                        "private_ip": "10.70.1.10",
                                        "access": {"ssh_key": "tesis-key", "public_ip": True},
                                    }
                                ],
                            }
                        ],
                        "provider_overrides": {
                            "aws": {
                                "internet_gateway": True,
                                "nat_gateway": {"enabled": False, "public_subnet": "", "elastic_ip": ""},
                                "route_tables": [{"name": "public", "routes": [{"dest_cidr": "0.0.0.0/0", "target": "igw"}]}],
                            }
                        },
                    }
                ],
                "connectivity": {
                    "mode": "isolated",
                    "hubs": [],
                    "links": [],
                },
            },
        }

        compiled = adapter.compile(neutral_payload)["payload"]

        self.assertEqual(compiled["cloud"], "aws")
        self.assertEqual(compiled["vlan"]["id"], "canvas-neutral-1")
        self.assertEqual(compiled["vpcs"][0]["name"], "Segment A")
        self.assertEqual(compiled["vpcs"][0]["subnets"][0]["instances"][0]["ssh_access"], "tesis-key")

    def test_planned_provider_executors_resolve_and_fail_explicitly(self):
        for provider in ("gcp", "azure"):
            executor = get_provider_executor(provider)
            bundle = executor.build_bundle("plan-123", {"cloud": provider})

            self.assertEqual(bundle.provider, provider)
            self.assertFalse(bundle.creds_ok_for_apply)
            self.assertIn("not implemented yet", bundle.full_log.lower())

            with self.assertRaisesMessage(NotImplementedError, "not implemented yet"):
                executor.terraform_init(bundle)


class TerraformTemplateRenderTests(SimpleTestCase):
    def test_preview_render_keeps_vm_resources_in_configuration(self):
        payload = {
            "name": "Lab render",
            "cloud": "aws",
            "simulate_only": True,
            "vpcs": [
                {
                    "id": "vpc-a",
                    "name": "VPC-A",
                    "region": "us-east-1",
                    "cidr_block": "10.30.0.0/16",
                    "internet_gateway": True,
                    "allowed_ssh_cidr": "203.0.113.10/32",
                    "nat_gateway": {"enabled": False, "public_subnet": "", "elastic_ip": ""},
                    "route_tables": [{"name": "public", "routes": [{"dest_cidr": "0.0.0.0/0", "target": "igw"}]}],
                    "subnets": [
                        {
                            "name": "public-a1",
                            "cidr_block": "10.30.1.0/24",
                            "availability_zone": "us-east-1a",
                            "subnet_type": "public",
                            "map_public_ip_on_launch": True,
                            "route_table": "public",
                            "instances": [
                                {
                                    "id": "vm-a1",
                                    "name": "bastion-a1",
                                    "ami": "ami-0123456789abcdef0",
                                    "instance_type": "t2.micro",
                                    "ip_address": "10.30.1.10",
                                    "ssh_access": "tesis-key",
                                    "associate_public_ip": True,
                                }
                            ],
                        }
                    ],
                }
            ],
            "links": [],
            "routers": [],
        }

        workdir, _state_path, tf_text = render_workspace(
            plan_id="plan-render-preview",
            payload=payload,
            simulate_only=True,
            prefix="tf-test-",
        )

        self.assertTrue(workdir)
        self.assertIn('resource "aws_security_group" "vm_sg"', tf_text)
        self.assertIn('resource "aws_instance" "vm"', tf_text)
        self.assertIn('count = 0', tf_text)


class ApplyAuditContextTests(SimpleTestCase):
    def test_build_last_apply_context_snapshots_identity_and_connection(self):
        connection = SimpleNamespace(
            id="conn-123",
            name="AWS alumno22",
            scope=CLOUD_SCOPE_PERSONAL,
        )
        bundle = SimpleNamespace(
            diag={"credential_source": "cloud_connection", "aws_region": "us-east-1"},
            runtime_env={"AWS_DEFAULT_REGION": "us-east-1"},
        )

        context = _build_last_apply_context(
            provider="aws",
            connection=connection,
            bundle=bundle,
            identity={
                "Account": "123456789012",
                "Arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
                "UserId": "AIDAEXAMPLE",
            },
        )

        self.assertEqual(context["provider"], "aws")
        self.assertEqual(context["credential_source"], "cloud_connection")
        self.assertEqual(context["cloud_connection_id"], "conn-123")
        self.assertEqual(context["cloud_connection_name"], "AWS alumno22")
        self.assertEqual(context["cloud_connection_scope"], CLOUD_SCOPE_PERSONAL)
        self.assertEqual(context["region"], "us-east-1")
        self.assertEqual(context["account_id"], "123456789012")
        self.assertEqual(context["arn"], "arn:aws:iam::123456789012:user/alumno22-syslab")
        self.assertEqual(context["user_id"], "AIDAEXAMPLE")
        self.assertIn("captured_at", context)


class AssumeRoleConnectionTests(SimpleTestCase):
    @patch("api.cloud_connections.build_base_aws_session")
    def test_build_runtime_env_assume_role_uses_sts_credentials(self, mocked_base_session):
        fake_sts = SimpleNamespace(
            assume_role=lambda **_kwargs: {
                "Credentials": {
                    "AccessKeyId": "ASIAEXAMPLE",
                    "SecretAccessKey": "temp-secret",
                    "SessionToken": "temp-token",
                }
            }
        )
        mocked_base_session.return_value = SimpleNamespace(client=lambda *_args, **_kwargs: fake_sts)
        connection = CloudConnection(
            name="AWS role",
            provider="aws",
            auth_type=CLOUD_AUTH_AWS_ASSUME_ROLE,
            aws_role_arn="arn:aws:iam::123456789012:role/syslab-course-role",
            aws_external_id_encrypted=encrypt_secret("ext-123"),
            default_region="us-east-1",
        )

        env = build_aws_runtime_env(connection)

        self.assertEqual(env["AWS_ACCESS_KEY_ID"], "ASIAEXAMPLE")
        self.assertEqual(env["AWS_SECRET_ACCESS_KEY"], "temp-secret")
        self.assertEqual(env["AWS_SESSION_TOKEN"], "temp-token")
        self.assertEqual(env["AWS_REGION"], "us-east-1")


class VisibilityApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="secret123",
        )
        self.admin.profile.role = ROLE_PLATFORM_ADMIN
        self.admin.profile.status = STATUS_ACTIVE
        self.admin.profile.save()

        self.teacher = User.objects.create_user(
            username="teacher@example.com",
            email="teacher@example.com",
            password="secret123",
        )
        self.teacher.profile.role = ROLE_TEACHER
        self.teacher.profile.status = STATUS_ACTIVE
        self.teacher.profile.save()

        self.other_teacher = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="secret123",
        )
        self.other_teacher.profile.role = ROLE_TEACHER
        self.other_teacher.profile.status = STATUS_ACTIVE
        self.other_teacher.profile.save()

        self.student = User.objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="secret123",
        )
        self.student.profile.role = ROLE_STUDENT
        self.student.profile.status = STATUS_ACTIVE
        self.student.profile.save()

        self.other_student = User.objects.create_user(
            username="other-student@example.com",
            email="other-student@example.com",
            password="secret123",
        )
        self.other_student.profile.role = ROLE_STUDENT
        self.other_student.profile.status = STATUS_ACTIVE
        self.other_student.profile.save()

        self.unassigned_student = User.objects.create_user(
            username="unassigned@example.com",
            email="unassigned@example.com",
            password="secret123",
        )
        self.unassigned_student.profile.role = ROLE_STUDENT
        self.unassigned_student.profile.status = STATUS_ACTIVE
        self.unassigned_student.profile.save()

        self.course = Course.objects.create(name="Redes 1", teacher=self.teacher)
        self.other_course = Course.objects.create(name="Redes 2", teacher=self.other_teacher)
        self.student.profile.course = self.course
        self.student.profile.save(update_fields=["course", "updated_at"])
        self.other_student.profile.course = self.other_course
        self.other_student.profile.save(update_fields=["course", "updated_at"])

        self.student_lab = Lab.objects.create(
            name="Lab alumno",
            owner_user=self.student,
            course=self.course,
            visibility_scope=VISIBILITY_OWNER,
            created_by_role=ROLE_STUDENT,
            legacy_canvas_id="lab-student",
        )
        self.shared_teacher_lab = Lab.objects.create(
            name="Lab compartido",
            owner_user=self.teacher,
            course=self.course,
            visibility_scope=VISIBILITY_COURSE,
            created_by_role=ROLE_TEACHER,
            legacy_canvas_id="lab-course",
        )
        self.other_course_lab = Lab.objects.create(
            name="Lab ajeno",
            owner_user=self.other_student,
            course=self.other_course,
            visibility_scope=VISIBILITY_OWNER,
            created_by_role=ROLE_STUDENT,
            legacy_canvas_id="lab-other",
        )
        self.student_connection = CloudConnection.objects.create(
            name="AWS alumno",
            provider="aws",
            scope=CLOUD_SCOPE_PERSONAL,
            owner_user=self.student,
            aws_access_key_id="AKIASTUDENT1234",
            aws_secret_access_key_encrypted=encrypt_secret("student-secret"),
            default_region="us-east-1",
        )
        self.course_connection = CloudConnection.objects.create(
            name="AWS curso",
            provider="aws",
            scope=CLOUD_SCOPE_COURSE_SHARED,
            course=self.course,
            created_by=self.teacher,
            aws_access_key_id="AKIACOURSE1234",
            aws_secret_access_key_encrypted=encrypt_secret("course-secret"),
            default_region="us-east-1",
        )

        Plan.objects.create(
            name="Plan alumno",
            payload={"name": "Plan alumno", "cloud": "aws", "vpcs": []},
            canvas_id=self.student_lab.canvas_id,
            lab=self.student_lab,
        )
        Plan.objects.create(
            name="Plan compartido",
            payload={"name": "Plan compartido", "cloud": "aws", "vpcs": []},
            canvas_id=self.shared_teacher_lab.canvas_id,
            lab=self.shared_teacher_lab,
        )
        Plan.objects.create(
            name="Plan ajeno",
            payload={"name": "Plan ajeno", "cloud": "aws", "vpcs": []},
            canvas_id=self.other_course_lab.canvas_id,
            lab=self.other_course_lab,
        )

    def test_teacher_sees_labs_for_their_course(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.get("/api/labs/")
        self.assertEqual(res.status_code, 200)
        names = {item["name"] for item in res.json()}
        self.assertIn("Lab alumno", names)
        self.assertIn("Lab compartido", names)
        self.assertNotIn("Lab ajeno", names)

    def test_student_only_sees_own_and_course_shared_labs(self):
        self.client.force_authenticate(self.student)
        res = self.client.get("/api/labs/")
        self.assertEqual(res.status_code, 200)
        names = {item["name"] for item in res.json()}
        self.assertIn("Lab alumno", names)
        self.assertIn("Lab compartido", names)
        self.assertNotIn("Lab ajeno", names)

    def test_plan_listing_is_filtered_by_visible_labs(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.get("/api/network/plans/")
        self.assertEqual(res.status_code, 200)
        first = res.json()[0]
        self.assertIn("canvas_id", first)
        self.assertEqual(first["canvas_id"], first["firestore_vpc_id"])
        self.assertIn("lab", first)
        self.assertIn("owner_user", first["lab"])
        self.assertIn("owner_user", first)
        names = {item["name"] for item in res.json()}
        self.assertIn("Plan alumno", names)
        self.assertIn("Plan compartido", names)
        self.assertNotIn("Plan ajeno", names)
        plans_by_name = {item["name"]: item for item in res.json()}
        self.assertEqual(plans_by_name["Plan alumno"]["lab"]["owner_user"]["email"], "student@example.com")
        self.assertEqual(plans_by_name["Plan alumno"]["owner_user"]["email"], "student@example.com")

    def test_teacher_sees_unassigned_students_but_not_other_teacher_students(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.get("/api/users/")
        self.assertEqual(res.status_code, 200)
        emails = {item["email"] for item in res.json()}
        self.assertIn("student@example.com", emails)
        self.assertIn("unassigned@example.com", emails)
        self.assertNotIn("other-student@example.com", emails)

    def test_lab_create_accepts_legacy_provider_payload_shapes(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            "/api/labs/",
            {
                "name": "Lab legacy provider",
                "target_provider": '["AWS"]',
                "cidr_block": "10.40.0.0",
                "prefix_length": 16,
                "course_id": str(self.course.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["target_provider"], "aws")

    def test_sync_from_canvas_accepts_legacy_string_canvas_id_with_neutral_payload(self):
        self.client.force_authenticate(self.admin)
        payload = {
            "name": "Plan neutral legacy id",
            "target_provider": "aws",
            "canvas_id": "canvas-legacy-123",
            "metadata": {
                "name": "Plan neutral legacy id",
                "canvas_id": "canvas-legacy-123",
                "source_format": "neutral_topology",
            },
            "topology": {
                "network": {
                    "id": "canvas-legacy-123",
                    "name": "Plan neutral legacy id",
                    "region": "us-east-1",
                    "cidr": "10.70.0.0/16",
                },
                "segments": [
                    {
                        "id": "segment-a",
                        "name": "Segment A",
                        "region": "us-east-1",
                        "cidr": "10.70.0.0/16",
                        "ingress": {"ssh_cidr": "203.0.113.5/32"},
                        "zones": [
                            {
                                "id": "public-a",
                                "name": "public-a",
                                "cidr": "10.70.1.0/24",
                                "kind": "public",
                                "availability_zone": "us-east-1a",
                                "map_public_ip_on_launch": True,
                                "route_table": "public",
                                "workloads": [],
                                "provider_overrides": {
                                    "aws": {
                                        "subnet_type": "public",
                                        "route_table": "public",
                                    }
                                },
                            }
                        ],
                        "provider_overrides": {
                            "aws": {
                                "internet_gateway": True,
                                "nat_gateway": {
                                    "enabled": False,
                                    "public_subnet": "",
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
                            }
                        },
                    }
                ],
                "connectivity": {"mode": "isolated", "hubs": [], "links": []},
            },
        }

        res = self.client.post(
            "/api/network/plans/sync-from-canvas/",
            payload,
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        plan = Plan.objects.get(id=res.json()["plan_id"])
        self.assertEqual(plan.canvas_id, "canvas-legacy-123")
        self.assertEqual(plan.firestore_vpc_id, "canvas-legacy-123")
        self.assertEqual(plan.payload["canvas_id"], "canvas-legacy-123")
        self.assertNotIn("firestore_vpc_id", plan.payload)
        self.assertEqual(plan.payload["vpcs"][0]["name"], "Segment A")
        self.assertEqual(plan.payload["cloud"], "aws")

    @patch("api.views.process_network_plan.delay")
    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_redeploy_apply_is_allowed_for_applied_plan(self, _can_run_real_terraform, mocked_delay):
        mocked_delay.return_value = SimpleNamespace(id="task-redeploy-1")
        plan = Plan.objects.create(
            name="Plan redeploy",
            payload={"name": "Plan redeploy", "cloud": "aws", "vpcs": [], "simulate_only": False},
            canvas_id="lab-redeploy",
            lab=self.shared_teacher_lab,
            applied=True,
            status=Plan.Status.SUCCESS,
            last_action=Plan.LastAction.APPLY,
        )

        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": False},
            format="json",
        )

        self.assertEqual(res.status_code, 202)
        plan.refresh_from_db()
        self.assertEqual(plan.status, Plan.Status.RUNNING)
        self.assertEqual(plan.last_action, Plan.LastAction.APPLY)
        self.assertEqual(plan.task_id, "task-redeploy-1")

    @patch("api.views.process_network_plan.delay")
    def test_teacher_can_preview_student_plan_but_cannot_apply_real(self, mocked_delay):
        mocked_delay.return_value = SimpleNamespace(id="task-preview-1")
        plan = Plan.objects.get(name="Plan alumno")

        self.client.force_authenticate(self.teacher)

        preview_res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": True},
            format="json",
        )

        self.assertEqual(preview_res.status_code, 202)
        plan.refresh_from_db()
        self.assertEqual(plan.last_action, Plan.LastAction.PLAN)

        plan.status = Plan.Status.SUCCESS
        plan.save(update_fields=["status", "updated_at"])

        apply_res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": False},
            format="json",
        )

        self.assertEqual(apply_res.status_code, 403)
        self.assertEqual(apply_res.json()["code"], "PLAN_EXECUTION_FORBIDDEN")

    @patch("api.views.process_network_plan.delay")
    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_teacher_can_apply_student_plan_when_effective_connection_is_course_shared(
        self,
        _can_run_real_terraform,
        mocked_delay,
    ):
        mocked_delay.return_value = SimpleNamespace(id="task-course-apply-1")
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])
        plan = Plan.objects.get(name="Plan alumno")

        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": False},
            format="json",
        )

        self.assertEqual(res.status_code, 202)
        plan.refresh_from_db()
        self.assertEqual(plan.status, Plan.Status.RUNNING)
        self.assertEqual(plan.last_action, Plan.LastAction.APPLY)
        self.assertEqual(plan.task_id, "task-course-apply-1")

    @patch("api.views.process_network_plan.delay")
    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_teacher_can_apply_student_plan_when_personal_connection_has_active_delegation(
        self,
        _can_run_real_terraform,
        mocked_delay,
    ):
        mocked_delay.return_value = SimpleNamespace(id="task-delegated-apply-1")
        plan = Plan.objects.get(name="Plan alumno")
        delegation = CloudExecutionDelegation.objects.create(
            lab=self.student_lab,
            cloud_connection=self.student_connection,
            owner_user=self.student,
            delegate_user=self.teacher,
            course=self.course,
            provider="aws",
            note="Revisión docente autorizada",
            created_by=self.student,
            expires_at=timezone.now() + timedelta(hours=2),
        )

        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": False},
            format="json",
        )

        self.assertEqual(res.status_code, 202)
        execution = PlanExecutionRecord.objects.filter(plan=plan).order_by("-created_at").first()
        self.assertIsNotNone(execution)
        self.assertEqual(execution.delegation_id, delegation.id)
        self.assertEqual(execution.requested_by_id, self.teacher.id)

    def test_teacher_cannot_destroy_student_plan(self):
        plan = Plan.objects.get(name="Plan alumno")
        plan.applied = True
        plan.status = Plan.Status.SUCCESS
        plan.last_action = Plan.LastAction.APPLY
        plan.save(update_fields=["applied", "status", "last_action", "updated_at"])

        self.client.force_authenticate(self.teacher)
        res = self.client.post(f"/api/network/plans/{plan.id}/destroy/", format="json")

        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "PLAN_EXECUTION_FORBIDDEN")

    @patch("api.views.destroy_last_deploy.delay")
    def test_teacher_can_destroy_student_plan_when_effective_connection_is_course_shared(self, mocked_delay):
        mocked_delay.return_value = SimpleNamespace(id="task-course-destroy-1")
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])
        plan = Plan.objects.get(name="Plan alumno")
        plan.applied = True
        plan.status = Plan.Status.SUCCESS
        plan.last_action = Plan.LastAction.APPLY
        plan.save(update_fields=["applied", "status", "last_action", "updated_at"])

        self.client.force_authenticate(self.teacher)
        res = self.client.post(f"/api/network/plans/{plan.id}/destroy/", format="json")

        self.assertEqual(res.status_code, 202)
        plan.refresh_from_db()
        self.assertEqual(plan.status, Plan.Status.RUNNING)
        self.assertEqual(plan.last_action, Plan.LastAction.DESTROY)

    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_real_apply_is_blocked_when_current_cloud_target_differs_from_last_real_apply(
        self,
        _can_run_real_terraform,
    ):
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])
        plan = Plan.objects.get(name="Plan alumno")
        plan.last_apply_context = {
            "provider": "aws",
            "credential_source": "cloud_connection",
            "region": "us-east-1",
            "cloud_connection_id": str(self.student_connection.id),
            "cloud_connection_name": self.student_connection.name,
            "cloud_connection_scope": self.student_connection.scope,
            "account_id": "123456789012",
            "arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
            "user_id": "AIDAEXAMPLE",
            "captured_at": "2026-04-07T20:00:00Z",
        }
        plan.save(update_fields=["last_apply_context", "updated_at"])

        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            f"/api/network/plans/{plan.id}/deploy/",
            {"simulate_only": False},
            format="json",
        )

        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "CLOUD_TARGET_CHANGED")

    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_destroy_is_blocked_when_current_cloud_target_differs_from_last_real_apply(
        self,
        _can_run_real_terraform,
    ):
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])
        plan = Plan.objects.get(name="Plan alumno")
        plan.applied = True
        plan.status = Plan.Status.SUCCESS
        plan.last_action = Plan.LastAction.APPLY
        plan.last_apply_context = {
            "provider": "aws",
            "credential_source": "cloud_connection",
            "region": "us-east-1",
            "cloud_connection_id": str(self.student_connection.id),
            "cloud_connection_name": self.student_connection.name,
            "cloud_connection_scope": self.student_connection.scope,
            "account_id": "123456789012",
            "arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
            "user_id": "AIDAEXAMPLE",
            "captured_at": "2026-04-07T20:00:00Z",
        }
        plan.save(update_fields=["applied", "status", "last_action", "last_apply_context", "updated_at"])

        self.client.force_authenticate(self.teacher)
        res = self.client.post(f"/api/network/plans/{plan.id}/destroy/", format="json")

        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "CLOUD_TARGET_CHANGED")

    def test_plan_list_exposes_apply_capability_to_teacher_when_student_lab_uses_course_shared(self):
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])

        self.client.force_authenticate(self.teacher)
        res = self.client.get("/api/network/plans/")

        self.assertEqual(res.status_code, 200)
        plans_by_name = {item["name"]: item for item in res.json()}
        self.assertTrue(plans_by_name["Plan alumno"]["can_apply"])

    def test_plan_list_exposes_apply_capability_by_owner(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.get("/api/network/plans/")
        self.assertEqual(res.status_code, 200)

        plans_by_name = {item["name"]: item for item in res.json()}
        self.assertFalse(plans_by_name["Plan alumno"]["can_apply"])
        self.assertTrue(plans_by_name["Plan compartido"]["can_apply"])

    def test_plan_detail_exposes_last_apply_context(self):
        plan = Plan.objects.get(name="Plan alumno")
        plan.last_apply_context = {
            "provider": "aws",
            "credential_source": "cloud_connection",
            "region": "us-east-1",
            "cloud_connection_id": str(self.student_connection.id),
            "cloud_connection_name": self.student_connection.name,
            "cloud_connection_scope": self.student_connection.scope,
            "account_id": "123456789012",
            "arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
            "user_id": "AIDAEXAMPLE",
            "identity": {
                "Account": "123456789012",
                "Arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
                "UserId": "AIDAEXAMPLE",
            },
            "captured_at": "2026-04-07T20:00:00Z",
        }
        plan.save(update_fields=["last_apply_context", "updated_at"])

        self.client.force_authenticate(self.student)
        res = self.client.get(f"/api/network/plans/{plan.id}/")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["last_apply_context"]["credential_source"], "cloud_connection")
        self.assertEqual(res.json()["last_apply_context"]["cloud_connection_id"], str(self.student_connection.id))
        self.assertEqual(res.json()["last_apply_context"]["account_id"], "123456789012")

    def test_plan_detail_exposes_execution_history(self):
        plan = Plan.objects.get(name="Plan alumno")
        PlanExecutionRecord.objects.create(
            plan=plan,
            lab=self.student_lab,
            requested_by=self.student,
            action=Plan.LastAction.APPLY,
            simulate_only=False,
            provider="aws",
            status=PlanExecutionRecord.Status.SUCCESS,
            task_id="task-history-1",
            cloud_connection=self.student_connection,
            cloud_connection_name=self.student_connection.name,
            cloud_connection_scope=self.student_connection.scope,
            resolved_execution_source="lab_explicit",
            credential_source="cloud_connection",
            account_id="123456789012",
            arn="arn:aws:sts::123456789012:assumed-role/syslab-student-role/syslab-1234",
            sts_user_id="AIDAEXAMPLE",
        )

        self.client.force_authenticate(self.student)
        res = self.client.get(f"/api/network/plans/{plan.id}/")

        self.assertEqual(res.status_code, 200)
        history = res.json()["execution_history"]
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["task_id"], "task-history-1")
        self.assertEqual(history[0]["credential_source"], "cloud_connection")
        self.assertEqual(history[0]["requested_by"]["email"], "student@example.com")

    def test_plan_detail_exposes_cloud_target_state_when_connection_changed(self):
        plan = Plan.objects.get(name="Plan alumno")
        self.student_lab.cloud_connection = self.course_connection
        self.student_lab.save(update_fields=["cloud_connection", "updated_at"])
        plan.last_apply_context = {
            "provider": "aws",
            "credential_source": "cloud_connection",
            "region": "us-east-1",
            "cloud_connection_id": str(self.student_connection.id),
            "cloud_connection_name": self.student_connection.name,
            "cloud_connection_scope": self.student_connection.scope,
            "account_id": "123456789012",
            "arn": "arn:aws:iam::123456789012:user/alumno22-syslab",
            "user_id": "AIDAEXAMPLE",
            "captured_at": "2026-04-07T20:00:00Z",
        }
        plan.save(update_fields=["last_apply_context", "updated_at"])

        self.client.force_authenticate(self.student)
        res = self.client.get(f"/api/network/plans/{plan.id}/")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["cloud_target_state"]["status"], "target_changed")
        self.assertTrue(res.json()["cloud_target_state"]["is_mismatch"])

    def test_plan_detail_exposes_resolved_execution_target(self):
        plan = Plan.objects.get(name="Plan alumno")

        self.client.force_authenticate(self.student)
        res = self.client.get(f"/api/network/plans/{plan.id}/")

        self.assertEqual(res.status_code, 200)
        target = res.json()["resolved_execution_target"]
        self.assertEqual(target["source"], "owner_personal_auto")
        self.assertEqual(target["id"], str(self.student_connection.id))
        self.assertEqual(target["name"], self.student_connection.name)

    def test_student_sees_personal_and_course_shared_cloud_connections(self):
        self.client.force_authenticate(self.student)
        res = self.client.get("/api/cloud-connections/?provider=aws")
        self.assertEqual(res.status_code, 200)
        names = {item["name"] for item in res.json()}
        self.assertIn("AWS alumno", names)
        self.assertIn("AWS curso", names)

    def test_student_can_create_personal_cloud_connection(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            "/api/cloud-connections/",
            {
                "name": "AWS personal 2",
                "provider": "aws",
                "scope": "personal",
                "auth_type": "aws_static_keys",
                "default_region": "us-east-1",
                "aws_access_key_id": "AKIATEST1234",
                "aws_secret_access_key": "secret-123",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["scope"], "personal")

    def test_teacher_can_create_course_shared_assume_role_connection(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            "/api/cloud-connections/",
            {
                "name": "AWS assume role curso",
                "provider": "aws",
                "scope": "course_shared",
                "auth_type": "aws_assume_role",
                "course_id": str(self.course.id),
                "default_region": "us-east-1",
                "aws_role_arn": "arn:aws:iam::123456789012:role/syslab-course-role",
                "aws_external_id": "ext-123",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["auth_type"], "aws_assume_role")
        self.assertEqual(res.json()["aws_role_arn"], "arn:aws:iam::123456789012:role/syslab-course-role")

    def test_student_cannot_create_course_shared_cloud_connection(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            "/api/cloud-connections/",
            {
                "name": "AWS curso intento alumno",
                "provider": "aws",
                "scope": "course_shared",
                "auth_type": "aws_static_keys",
                "course_id": str(self.course.id),
                "default_region": "us-east-1",
                "aws_access_key_id": "AKIATEST1234",
                "aws_secret_access_key": "secret-123",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_student_can_create_and_revoke_execution_delegation_for_course_teacher(self):
        self.client.force_authenticate(self.student)
        create_res = self.client.post(
            "/api/execution-delegations/",
            {
                "lab_id": str(self.student_lab.id),
                "note": "Autorización temporal para revisión",
            },
            format="json",
        )

        self.assertEqual(create_res.status_code, 201)
        delegation_id = create_res.json()["id"]
        self.assertEqual(create_res.json()["delegate_user"]["email"], "teacher@example.com")
        self.assertEqual(create_res.json()["cloud_connection"]["id"], str(self.student_connection.id))

        list_res = self.client.get("/api/execution-delegations/")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()), 1)

        revoke_res = self.client.post(f"/api/execution-delegations/{delegation_id}/revoke/")
        self.assertEqual(revoke_res.status_code, 200)
        self.assertEqual(revoke_res.json()["status"], "revoked")

    def test_lab_can_be_created_with_visible_cloud_connection(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            "/api/labs/",
            {
                "name": "Lab con cuenta personal",
                "target_provider": "aws",
                "cidr_block": "10.80.0.0",
                "prefix_length": 16,
                "region": "us-east-1",
                "cloud_connection_id": str(self.student_connection.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["cloud_connection"]["id"], str(self.student_connection.id))

    def test_lab_can_be_created_with_visible_course_shared_connection(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            "/api/labs/",
            {
                "name": "Lab con cuenta curso",
                "target_provider": "aws",
                "cidr_block": "10.81.0.0",
                "prefix_length": 16,
                "region": "us-east-1",
                "cloud_connection_id": str(self.course_connection.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["cloud_connection"]["id"], str(self.course_connection.id))
        self.assertEqual(res.json()["resolved_execution_target"]["source"], "lab_explicit")

    def test_lab_list_exposes_resolved_execution_target_sources(self):
        self.client.force_authenticate(self.student)
        res = self.client.get("/api/labs/")

        self.assertEqual(res.status_code, 200)
        labs_by_name = {item["name"]: item for item in res.json()}
        self.assertEqual(
            labs_by_name["Lab alumno"]["resolved_execution_target"]["source"],
            "owner_personal_auto",
        )
        self.assertEqual(
            labs_by_name["Lab alumno"]["resolved_execution_target"]["id"],
            str(self.student_connection.id),
        )
        self.assertEqual(
            labs_by_name["Lab compartido"]["resolved_execution_target"]["source"],
            "course_shared_auto",
        )
        self.assertEqual(
            labs_by_name["Lab compartido"]["resolved_execution_target"]["id"],
            str(self.course_connection.id),
        )

    def test_network_plan_create_preserves_applied_state_for_existing_active_plan(self):
        redeploy_lab = Lab.objects.create(
            name="Lab redeploy",
            owner_user=self.teacher,
            course=self.course,
            visibility_scope=VISIBILITY_COURSE,
            created_by_role=ROLE_TEACHER,
            legacy_canvas_id="lab-redeploy-active",
        )
        plan = Plan.objects.create(
            name="Plan activo",
            payload={"name": "Plan activo", "cloud": "aws", "vpcs": [], "simulate_only": False},
            canvas_id=redeploy_lab.canvas_id,
            lab=redeploy_lab,
            applied=True,
            status=Plan.Status.SUCCESS,
            last_action=Plan.LastAction.APPLY,
        )

        self.client.force_authenticate(self.teacher)
        res = self.client.post(
            "/api/network/plan/",
            {
                "name": "Plan activo",
                "canvas_id": redeploy_lab.canvas_id,
                "target_provider": "aws",
                "metadata": {"name": "Plan activo"},
                "topology": {
                    "network": {
                        "id": redeploy_lab.canvas_id,
                        "name": "Plan activo",
                        "region": "us-east-1",
                        "cidr": "10.0.0.0/16",
                    },
                    "segments": [],
                    "connectivity": {"mode": "isolated", "hubs": [], "links": []},
                },
            },
            format="json",
        )

        self.assertEqual(res.status_code, 200)
        plan.refresh_from_db()
        self.assertTrue(plan.applied)
        self.assertEqual(plan.status, Plan.Status.PENDING)
        self.assertEqual(plan.last_action, Plan.LastAction.CANVAS_UPDATE)
