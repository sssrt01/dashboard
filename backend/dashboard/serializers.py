import logging

import redis
from django.db.models import Q
from rest_framework import serializers

from .models import Shift, Product, Packing, PackingLog, BreakLog, ShiftTask


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class PackingCreateSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = Packing
        fields = ['id', 'product', 'product_id', 'value']

class PackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packing
        fields = '__all__'


class ShiftTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftTask
        fields = "__all__"
        read_only_fields = ['id', 'shift']

class ShiftSerializer(serializers.ModelSerializer):
    tasks = ShiftTaskSerializer(many=True, required=False)

    class Meta:
        model = Shift
        fields = "__all__"
        read_only_fields = ['id', 'user_starts']

    def create(self, validated_data):
        tasks_data = validated_data.pop("tasks", [])
        shift = Shift.objects.create(**validated_data)
        for task_data in tasks_data:
            ShiftTask.objects.create(shift=shift, **task_data)
        return shift

class PackingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackingLog
        fields = '__all__'

    def create(self, validated_data):
        shift = Shift.objects.filter(
            Q(status=Shift.Status.ACTIVE) | Q(status=Shift.Status.PAUSED)
        ).order_by('-id').first()
        redis_conn = redis.Redis(host="redis", port=6379, decode_responses=True)

        if shift:
            redis_conn.hincrby(f"shift:{shift.id}", "ready_value", 1)
            validated_data['shift'] = shift
        else:
            raise serializers.ValidationError("No active or paused shift found.")

        return super().create(validated_data)


class BreakLogSerializer(serializers.ModelSerializer):
    shift = ShiftSerializer()

    class Meta:
        model = BreakLog
        fields = '__all__'
