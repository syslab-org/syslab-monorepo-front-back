from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from intent_plugin.providers.heuristic import HeuristicIntentProvider
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
