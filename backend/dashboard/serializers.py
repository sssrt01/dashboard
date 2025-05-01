import redis
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import Shift, Product, Packing, PackingLog, BreakLog, ShiftTask, Master


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


###FIXME: Master obj dont sends to front
class ShiftTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftTask
        fields = "__all__"
        read_only_fields = ['id', 'shift']

class _ShiftTaskSerializer(serializers.ModelSerializer):
    product = serializers.CharField(source='product.name', read_only=True)
    packing = serializers.CharField(source='packing.value', read_only=True)

    class Meta:
        model = ShiftTask
        fields = "__all__"
        read_only_fields = ['id', 'shift']


class ShiftSerializer(serializers.ModelSerializer):
    tasks = ShiftTaskSerializer(many=True, write_only=True, required=False)
    shifttask_set = ShiftTaskSerializer(many=True, read_only=True)
    start_now = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['id', 'user_starts']

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise ValidationError("Користувач має бути автентифікованим.")

        tasks_data = validated_data.pop('tasks', [])
        start_now = validated_data.pop('start_now', False)

        with transaction.atomic():
            if start_now:
                validated_data['planned_start_time'] = timezone.now()

            shift = Shift.objects.create(user_starts=request.user, **validated_data)
            for task_data in tasks_data:
                ShiftTask.objects.create(shift=shift, **task_data)

        return shift


class PackingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackingLog
        fields = '__all__'

    def create(self, validated_data):
        shift = Shift.objects.filter(
            Q(status=Shift.Status.ACTIVE)
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


class DetailedShiftTaskSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    packing = PackingSerializer()

    class Meta:
        model = ShiftTask
        fields = "__all__"
        read_only_fields = ['id', 'shift']

class DetailedShiftSerializer(serializers.ModelSerializer):
    tasks = DetailedShiftTaskSerializer(many=True, required=False)
    shifttask_set = DetailedShiftTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Shift
        fields = "__all__"
        read_only_fields = ['id', 'user_starts']


class PlannedShiftTaskSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    packing = PackingSerializer()

    class Meta:
        model = ShiftTask
        fields = "__all__"
        read_only_fields = ['id', 'shift']


class PlannedShiftSerializer(serializers.ModelSerializer):
    shifttask_set = PlannedShiftTaskSerializer(many=True, read_only=True)
    master = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['id', 'user_starts']

    def get_master(self, obj):
        if obj.master:
            return {
                'id': obj.master.id,
                'name': obj.master.name
            }
        return None


class MasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Master
        fields = ['id', 'name']


class _ShiftSerializer(serializers.ModelSerializer):
    master = MasterSerializer(read_only=True)
    master_id = serializers.PrimaryKeyRelatedField(
        source='master', queryset=Master.objects.all(), write_only=True
    )

    class Meta:
        model = Shift
        fields = [
            'id', 'status', 'planned_start_time', 'start_time', 'end_time',
            'master', 'master_id'
        ]
        read_only_fields = ['start_time', 'end_time']


class ShiftListSerializer(serializers.ModelSerializer):
    master_name = serializers.CharField(source='master.name', read_only=True)

    class Meta:
        model = Shift
        fields = ['id', 'status', 'planned_start_time', 'start_time', 'end_time', 'master_name']
