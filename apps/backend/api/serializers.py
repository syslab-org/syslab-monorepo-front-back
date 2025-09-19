#/apps/backend/api/serializers.py
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
        fields = ("id", "name", "status", "task_id", "created_at", "payload")
        read_only_fields = fields
