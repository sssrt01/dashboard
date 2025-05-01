# serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Shift, ShiftTask, Product, Packing, Master

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name']


class PackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packing
        fields = ['id', 'value', 'norm']


class ShiftTaskSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    packing = PackingSerializer()

    class Meta:
        model = ShiftTask
        # все поля задачи, включая вложенные product и packing
        fields = [
            'id', 'type', 'remaining_time', 'order',
            'product', 'packing', 'target', 'ready_value',
            'time_needed', 'norm_in_minute', 'time_spent',
            'percent_from_shift', 'started_at', 'finished_at',
        ]


class MasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Master
        fields = ['id', 'name', 'is_active']


class ShiftDetailSerializer(serializers.ModelSerializer):
    user_starts = UserSerializer()
    user_ends = UserSerializer(allow_null=True)
    master = MasterSerializer()
    # именно так, чтобы ключ в JSON остался shifttask_set
    shifttask_set = ShiftTaskSerializer(many=True)

    class Meta:
        model = Shift
        fields = [
            'id',
            'planned_start_time', 'start_time', 'end_time',
            'status', 'active_task',
            'user_starts', 'user_ends', 'master',
            'shifttask_set',
        ]
