import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shift, Product, Packing, PackingLog, ProductPacking, DefaultSettings, ShiftTask
from .repos.redis_repository import RedisRepository
from .serializers import (
    ProductSerializer,
    PackingSerializer,
    PackingLogSerializer,
    ShiftSerializer,
    ShiftTaskSerializer,
    # ShiftTaskDetailedSerializer,
    PackingCreateSerializer, DetailedShiftSerializer
)
from . import task


class BaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    redis = RedisRepository()

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Packing.objects.all()
    serializer_class = PackingCreateSerializer
    permission_classes = [permissions.AllowAny]

class CalculatePercentageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        target = request.query_params.get('target')
        packing_id = request.query_params.get('packing_id')

        if not target or not packing_id:
            return Response({"detail": "Обов'язково вкажіть 'target' та 'packing_id'."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            # Отримуємо пакування та перевіряємо, чи існує воно
            packing = Packing.objects.get(id=packing_id)

            # Перевіряємо, чи є target числом
            try:
                target = float(target)
            except ValueError:
                return Response({"detail": "'target' має бути дійсним числом."}, status=status.HTTP_400_BAD_REQUEST)

            # Перевірка на ділення на нуль у norm_in_minute() та get_shift_duration_in_minute()
            norm_in_minute = packing.norm_in_minute()
            if norm_in_minute == 0:
                return Response({"detail": "Норма пакування дорівнює нулю, неможливо розрахувати відсоток."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Отримуємо тривалість зміни з DefaultSettings
            shift_duration = DefaultSettings.get_shift_duration_in_minute()
            if shift_duration == 0:
                return Response({"detail": "Тривалість зміни дорівнює нулю, неможливо розрахувати відсоток."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Розраховуємо відсоток на основі вказаного target
            time_needed_in_minute = target / norm_in_minute
            percent_from_shift = (time_needed_in_minute / shift_duration) * 100

            # Повертаємо розрахований відсоток
            return Response({"percentage": percent_from_shift, "time_in_minute": time_needed_in_minute},
                            status=status.HTTP_200_OK)

        except Packing.DoesNotExist:
            return Response({"detail": "Пакування з вказаним ID не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ProductViewSet(BaseViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'])
    def packings(self, request, pk=None):
        product = self.get_object()
        packings = Packing.objects.filter(productpacking__product=product)
        return Response(PackingSerializer(packings, many=True).data)

class ShiftViewSet(BaseViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            serializer.save(user_starts=request.user)
            shift = serializer.instance
            self._initialize_shift_in_redis(shift)
            self._save_shift_tasks(shift)
            task.lead_shift.apply_async(args=[shift.id])
            return Response(
                {"message": "Смена успешно создана!", "shift": serializer.data},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logging.exception("Shift creation error")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # @action(detail=False, methods=['get'])
    # def active(self, request):
    #     active_shift = Shift.objects.get_active_shift()
    #     if not active_shift:
    #         return Response({"detail": "Активна зміна не знайдена"}, status=404)
    #
    #     serializer = self.get_serializer(active_shift)
    #     return Response(serializer.data)

    def _initialize_shift_in_redis(self, shift):
        self.redis.update_shift_data(shift.id, {
            "id": shift.id,
            "name": shift.name,
            "status": shift.status,
            "active_task": 0,
        })

    def _save_shift_tasks(self, shift):
        for task in shift.shifttask_set.all():
            self.redis.save_task(task)


class ActiveShiftView(APIView):
    def get(self, request):
        active_shift = Shift.objects.get_active_shift()
        if not active_shift:
            return Response(
                {"detail": "Активна зміна не знайдена"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DetailedShiftSerializer(active_shift)
        return Response(serializer.data)

class PackingLogViewSet(BaseViewSet):
    queryset = PackingLog.objects.all()
    serializer_class = PackingLogSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        shift = Shift.objects.get_active_shift()
        if shift:
            self._update_shift_progress(shift)
        return super().create(request, *args, **kwargs)

    def _update_shift_progress(self, shift):
        task_id = self.redis.conn.lindex(
            f"shift:{shift.id}:tasks", 
            self.redis.get_active_task_index(shift.id)
        )
        if task_id:
            self.redis.increment_task_value(task_id, "ready_value")

class ShiftTaskViewSet(BaseViewSet):
    queryset = ShiftTask.objects.all()
    serializer_class = ShiftTaskSerializer

class IncrementActiveTaskView(APIView):
    permission_classes = [permissions.AllowAny]
    redis = RedisRepository()

    def patch(self, request):
        shift = Shift.objects.get_active_shift()
        if not shift:
            return self._error_response("Активная смена не найдена", status.HTTP_404_NOT_FOUND)

        try:
            shift.increment_active_task()
            self.redis.update_shift_data(shift.id, {"active_task": shift.active_task})
            return Response({
                "message": "Активное задание успешно обновлено",
                "new_active_task": shift.active_task
            })
        except Exception as e:
            logging.exception("Active task update error")
            return self._error_response("Ошибка обновления задания", status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _error_response(self, message, status_code):
        return Response({"error": message}, status=status_code)