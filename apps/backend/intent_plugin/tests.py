import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from intent_plugin.exceptions import IntentProviderExecutionError
from intent_plugin.providers.heuristic import HeuristicIntentProvider
from intent_plugin.providers.openai import OpenAIIntentProvider
from intent_plugin.service import get_manifest


class HeuristicIntentProviderTests(APITestCase):
    def test_generates_public_private_nat_topology(self):
        provider = HeuristicIntentProvider()
        result = provider.generate(
            type(
                "Req",
                (),
                {
                    "prompt": "Quiero una VPC con subnet publica, privada, NAT y 2 instancias",
                    "target_provider": "aws",
                    "region": "us-east-1",
                    "canvas_id": "lab-1",
                    "max_workloads": 4,
                },
            )()
        )

        self.assertEqual(result.intent["target_provider"], "aws")
        segment = result.intent["topology"]["segments"][0]
        self.assertTrue(segment["provider_overrides"]["aws"]["nat_gateway"]["enabled"])
        self.assertEqual(len(segment["zones"]), 2)


class OpenAIIntentProviderTests(APITestCase):
    def test_generates_structured_topology_from_llm_payload(self):
        response_payload = {
            "draft_name": "Web App Lab",
            "assumptions": ["Default CIDR 10.0.0.0/16 was used."],
            "warnings": [],
            "provider_overrides": {},
            "topology": {
                "network": {
                    "id": "",
                    "name": "Web App Lab",
                    "region": "us-east-1",
                    "cidr": "10.0.0.0/16",
                },
                "segments": [
                    {
                        "id": "vpc-a",
                        "name": "VPC-A",
                        "region": "us-east-1",
                        "cidr": "10.0.0.0/16",
                        "exposure": "mixed",
                        "internet_access": "direct",
                        "ingress": {"ssh_cidr": "0.0.0.0/0"},
                        "zones": [
                            {
                                "id": "public-a",
                                "name": "public-a",
                                "cidr": "10.0.1.0/24",
                                "kind": "public",
                                "availability_zone": "us-east-1a",
                                "map_public_ip_on_launch": True,
                                "route_table": "public",
                                "workloads": [
                                    {
                                        "id": "web-1",
                                        "name": "web-1",
                                        "kind": "workload",
                                        "image": "ami-amazon-linux-latest",
                                        "size": "t2.micro",
                                        "private_ip": "10.0.1.10",
                                        "zone_id": "public-a",
                                        "access": {"ssh_key": "", "public_ip": True},
                                        "provider_overrides": {"aws": {"ami": "ami-amazon-linux-latest"}},
                                    }
                                ],
                                "provider_overrides": {"aws": {"subnet_type": "public", "route_table": "public"}},
                            }
                        ],
                        "workloads": [],
                        "provider_overrides": {
                            "aws": {
                                "internet_gateway": True,
                                "nat_gateway": {"enabled": False, "public_subnet": "", "elastic_ip": ""},
                                "route_tables": [],
                            }
                        },
                    }
                ],
                "connectivity": {"mode": "isolated", "hubs": [], "links": []},
            },
        }

        fake_client = type(
            "FakeClient",
            (),
            {
                "responses": type(
                    "FakeResponses",
                    (),
                    {
                        "create": lambda self, **_kwargs: type(
                            "FakeResponse",
                            (),
                            {"output_text": json.dumps(response_payload)},
                        )()
                    },
                )()
            },
        )()

        provider = OpenAIIntentProvider(client=fake_client)
        result = provider.generate(
            type(
                "Req",
                (),
                {
                    "prompt": "Need a public and private web app lab",
                    "target_provider": "aws",
                    "region": "us-east-1",
                    "canvas_id": "canvas-1",
                    "max_workloads": 3,
                },
            )()
        )

        self.assertEqual(result.provider, "openai")
        self.assertEqual(result.draft_name, "Web App Lab")
        self.assertEqual(result.intent["topology"]["network"]["id"], "canvas-1")
        self.assertEqual(result.intent["topology"]["segments"][0]["zones"][0]["kind"], "public")
        self.assertEqual(len(result.intent["topology"]["segments"][0]["workloads"]), 1)


class IntentPluginApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="intent-user", password="pw123456")
        self.client.force_authenticate(self.user)

    def test_manifest_exposes_provider_configuration(self):
        response = self.client.get("/api/intent-plugin/manifest/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "intent-plugin")
        self.assertIn("provider", response.data)
        self.assertEqual(response.data["defaults"]["target_provider"], "aws")
        self.assertGreaterEqual(response.data["constraints"]["max_workloads"], 1)

    def test_generate_endpoint_returns_normalized_intent(self):
        response = self.client.post(
            "/api/intent-plugin/generate/",
            {
                "prompt": "Necesito una VPC publica y privada con NAT y 3 instancias",
                "target_provider": "aws",
                "region": "us-east-1",
                "canvas_id": "canvas-123",
                "max_workloads": 3,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["intent"]["metadata"]["canvas_id"], "canvas-123")
        self.assertEqual(response.data["intent"]["target_provider"], "aws")
        self.assertIn("topology", response.data["intent"])

    @override_settings(INTENT_PLUGIN_ENABLED=False)
    def test_generate_endpoint_returns_409_when_disabled(self):
        response = self.client.post(
            "/api/intent-plugin/generate/",
            {
                "prompt": "Necesito una VPC simple",
                "target_provider": "aws",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertFalse(response.data["ok"])

    def test_manifest_helper_reports_current_provider(self):
        manifest = get_manifest()

        self.assertTrue(manifest["enabled"])
        self.assertEqual(manifest["provider"]["slug"], "heuristic")
        self.assertEqual(manifest["defaults"]["region"], "us-east-1")

    @patch("intent_plugin.views.generate_intent", side_effect=IntentProviderExecutionError("upstream failure"))
    def test_generate_endpoint_returns_424_when_provider_execution_fails(self, _mock_generate):
        response = self.client.post(
            "/api/intent-plugin/generate/",
            {
                "prompt": "Necesito una VPC simple",
                "target_provider": "aws",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 424)
        self.assertFalse(response.data["ok"])
