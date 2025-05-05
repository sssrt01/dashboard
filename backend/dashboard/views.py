import logging

from django.db.models import Prefetch
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shift, Product, Packing, PackingLog, DefaultSettings, ShiftTask, Master
from .repos.redis_repository import RedisRepository
from .ser import ShiftDetailSerializer
from .serializers import (
    ProductSerializer,
    PackingSerializer,
    PackingLogSerializer,
    ShiftSerializer,
    ShiftTaskSerializer,
    # ShiftTaskDetailedSerializer,
    PackingCreateSerializer, DetailedShiftSerializer, _ShiftTaskSerializer,
    ShiftListSerializer
)


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


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    @action(detail=True, methods=['get'])
    def task_history(self, request, pk=None):
        shift = self.get_object()
        tasks = shift.shifttask_set.all()
        serializer = _ShiftTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        shift = self.get_object()
        if shift.status != Shift.Status.PLANNED:
            raise PermissionDenied("Можна видаляти тільки заплановані зміни")
        return super().destroy(request, *args, **kwargs)


    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)

        if is_many:
            serializer = self.get_serializer(data=request.data, many=True)
        else:
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        if is_many:
            created_shifts = []
            for item in serializer.validated_data:
                shift_serializer = self.get_serializer(data=item)
                shift_serializer.is_valid(raise_exception=True)
                created_shift = shift_serializer.save()
                created_shifts.append(created_shift)

            response_serializer = self.get_serializer(created_shifts, many=True)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # def create(self, request, *args, **kwargs):
    #     serializer = self.get_serializer(data=request.data)
    #     if not serializer.is_valid():
    #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    #
    #     try:
    #         serializer.save(user_starts=request.user)
    #         shift = serializer.instance
    #         self._initialize_shift_in_redis(shift)
    #         self._save_shift_tasks(shift)
    #         task.lead_shift.apply_async(args=[shift.id])
    #         return Response(
    #             {"message": "Смена успешно создана!", "shift": serializer.data},
    #             status=status.HTTP_201_CREATED
    #         )
    #     except Exception as e:
    #         logging.exception("Shift creation error")
    #         return Response(
    #             {"error": str(e)},
    #             status=status.HTTP_500_INTERNAL_SERVER_ERROR
    #         )



    def _save_shift_tasks(self, shift):
        for task in shift.shifttask_set.all():
            self.redis.save_task(task)


class ShiftListAPI(APIView):
    def get(self, request):
        status_filter = request.query_params.get('status')
        queryset = Shift.objects.select_related('master')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = ShiftListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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


class MasterViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Master.objects.filter(is_active=True)

    def list(self, request):
        masters = self.get_queryset()
        data = [{'id': master.id, 'name': master.name} for master in masters]
        return Response(data)


class ShiftDetailAPIView(generics.RetrieveAPIView):
    """
    Возвращает:
    - shift (id, times, status, active_task)
    - user_starts, user_ends (username)
    - master (name)
    - shifttask_set: массив задач, внутри вложены product и packing
    """
    queryset = Shift.objects.all() \
        .select_related('user_starts', 'user_ends', 'master') \
        .prefetch_related(
        Prefetch('shifttask_set',
                 queryset=ShiftTask.objects.select_related('product', 'packing')
                 )
    )
    serializer_class = ShiftDetailSerializer
    lookup_field = 'id'
