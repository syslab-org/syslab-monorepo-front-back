from rest_framework import serializers

from intent_plugin.conf import default_region, max_workloads


class IntentGenerateRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField(max_length=2000, trim_whitespace=True)
    target_provider = serializers.ChoiceField(choices=["aws"], default="aws")
    region = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
    canvas_id = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    max_workloads = serializers.IntegerField(required=False, min_value=1, max_value=max_workloads(), default=3)

    def validate_region(self, value):
        return (value or default_region()).strip()


class IntentGenerateResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    draft_name = serializers.CharField()
    provider = serializers.CharField()
    intent = serializers.JSONField()
    assumptions = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
