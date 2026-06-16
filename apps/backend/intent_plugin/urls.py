from django.urls import path

from intent_plugin.views import IntentGenerateView, intent_manifest_view


urlpatterns = [
    path("manifest/", intent_manifest_view, name="intent-plugin-manifest"),
    path("generate/", IntentGenerateView.as_view(), name="intent-plugin-generate"),
]

