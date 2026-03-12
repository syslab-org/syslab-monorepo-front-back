from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from .models import Course, Lab, Plan, ROLE_PLATFORM_ADMIN, ROLE_STUDENT, ROLE_TEACHER, STATUS_ACTIVE, VISIBILITY_COURSE, VISIBILITY_OWNER

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

        Plan.objects.create(
            name="Plan alumno",
            payload={"name": "Plan alumno", "cloud": "aws", "vpcs": []},
            firestore_vpc_id=self.student_lab.canvas_id,
            lab=self.student_lab,
        )
        Plan.objects.create(
            name="Plan compartido",
            payload={"name": "Plan compartido", "cloud": "aws", "vpcs": []},
            firestore_vpc_id=self.shared_teacher_lab.canvas_id,
            lab=self.shared_teacher_lab,
        )
        Plan.objects.create(
            name="Plan ajeno",
            payload={"name": "Plan ajeno", "cloud": "aws", "vpcs": []},
            firestore_vpc_id=self.other_course_lab.canvas_id,
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
        names = {item["name"] for item in res.json()}
        self.assertIn("Plan alumno", names)
        self.assertIn("Plan compartido", names)
        self.assertNotIn("Plan ajeno", names)

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

    @patch("api.views.process_network_plan.delay")
    @patch("api.views._can_run_real_terraform", return_value=True)
    def test_redeploy_apply_is_allowed_for_applied_plan(self, _can_run_real_terraform, mocked_delay):
        mocked_delay.return_value = SimpleNamespace(id="task-redeploy-1")
        plan = Plan.objects.create(
            name="Plan redeploy",
            payload={"name": "Plan redeploy", "cloud": "aws", "vpcs": [], "simulate_only": False},
            firestore_vpc_id="lab-redeploy",
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
