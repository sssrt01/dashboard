import json
import logging

import redis
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.forms.models import model_to_dict
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from main import settings
from . import task
from .models import Shift, Product, Packing, PackingLog, BreakLog, ProductPacking, DefaultSettings
from .serializers import ProductSerializer, PackingCreateSerializer, PackingLogSerializer, PackingSerializer, \
    ShiftSerializer, ShiftTaskSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'], url_path='packings')
    def get_packings(self, request, pk=None):
        """
        Возвращает упаковки для конкретного продукта.
        """
        try:
            product = self.get_object()
            product_packings = ProductPacking.objects.filter(product=product)
            packings = [product_packing.packing for product_packing in product_packings]
            serializer = PackingSerializer(packings, many=True)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'error': 'Продукт не найден.'}, status=404)

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Packing.objects.all()
    serializer_class = PackingCreateSerializer
    permission_classes = [permissions.AllowAny]


class LastTenShiftsView(APIView):
    def get(self, request):
        try:
            shifts = Shift.objects.order_by('-id')[:10]
            serializer = ShiftSerializer(shifts, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logging.error(f"Shift list error: {e}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ShiftViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    redis_conn = redis.Redis(
        host=settings.REDIS_CONFIG["HOST"],
        port=settings.REDIS_CONFIG["PORT"],
        db=settings.REDIS_CONFIG["DB"],
        password=settings.REDIS_CONFIG["PASSWORD"],
        decode_responses=True,
    )

    def update_redis(self, activity, id, data):
        """
        Обновляет данные смены в Redis.
        """
        key = f"{activity}:{id}"
        try:
            self.redis_conn.hset(key, mapping=data)
        except Exception as e:
            logging.exception(f"Redis update error for key {key} with data {data}")
            raise

    def save_task(self, task):
        key = f"task:{task.id}"
        if task.type == "TASK":
            task_data = {
                "id": task.id,
                "type": task.type,
                "order": task.order,
                "target": task.target,
                "ready_value": 0,  # По умолчанию 0
                # Другие поля:
                "product": getattr(task, 'product_id', None),
                "packing": getattr(task, 'packing_id', None),
                "shift": task.shift_id,
            }
        else:
            task_data = {
                "id": task.id,
                "type": task.type,
                "order": task.order,
                "remaining_time": task.remaining_time,
                "shift": task.shift_id,
            }
        try:
            self.redis_conn.hset(key, mapping=task_data)
            self.redis_conn.rpush(f"shift:{task.shift_id}:tasks", task.id)
        except Exception as e:
            logging.exception(f"Redis error while saving task {task.id} with data {task_data}")
            raise

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.validated_data['user_starts'] = request.user
                serializer.save()
            except Exception as e:
                logging.exception("Ошибка при сохранении смены в БД")
                return Response({"error": "Ошибка при сохранении смены в БД."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            shift = serializer.instance
            logging.warning(shift)
            tasks = shift.shifttask_set.all()

            try:
                # Сохраняем данные смены в Redis (без списка заданий, т.к. задания сохраняются отдельно)
                self.update_redis(
                    "shift",
                    shift.id,
                    {
                        "id": shift.id,
                        "name": shift.name,
                        "status": shift.status,
                        "active_task": 0,
                    }
                )

                # Сохраняем каждое задание в Redis как отдельный хэш и добавляем его id в список заданий для смены
                for _task in tasks:
                    self.save_task(_task)
                result = task.lead_shift.apply_async(args=[shift.id])
                logging.warning(result)
                logging.warning("TASK GONE")
            except Exception as e:
                logging.exception(f"Ошибка при сохранении данных смены {shift.id} в Redis")
                return Response({"error": "Не удалось сохранить данные смены в Redis."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({"message": "Смена успешно создана!", "shift": ShiftSerializer(shift).data},
                            status=status.HTTP_201_CREATED)
        else:
            logging.error(f"Ошибки валидации: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# class ShiftViewSet(viewsets.ModelViewSet):
#     permission_classes = [IsAuthenticated]
#     serializer_class = ShiftCreateSerializer
#     queryset = Shift.objects.all()
#
#     redis_conn = redis.Redis(
#         host=settings.REDIS_CONFIG["HOST"],
#         port=settings.REDIS_CONFIG["PORT"],
#         db=settings.REDIS_CONFIG["DB"],
#         password=settings.REDIS_CONFIG["PASSWORD"],
#         decode_responses=True,
#     )
#
#     def update_redis(self, shift_id, data):
#         """
#         Обновляет данные смены в Redis.
#         """
#         try:
#             self.redis_conn.hset(f"shift:{shift_id}", mapping=data)
#         except Exception as e:
#             logging.error(f"Redis update error for shift {shift_id}: {e}")
#             raise
#
#     def create(self, request, *args, **kwargs):
#         """
#         Создает новую смену, сохраняет ее в Redis и запускает таймер.
#         """
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         serializer.save(user_starts=request.user)
#         serializer.save()
#         shift = serializer.instance
#         try:
#             self.update_redis(
#                 shift.id,
#                 {
#                     "id": shift.id,
#                     "name": shift.name,
#                     "product": str(shift.product),
#                     "packing": str(shift.packing),
#                     "target_value": shift.target_value,
#                     "ready_value": shift.ready_value,
#                     "is_paused": 0,
#                     "remaining_time": shift.shift_time,
#                     "total_time": shift.shift_time,
#                     "status": shift.status,
#                 }
#             )
#             task.countdown_timer.apply_async(args=[shift.id])
#         except Exception as e:
#             logging.error(f"Error while creating shift {shift.id}: {e}")
#             return Response({"error": "Failed to create shift."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
#
#         return Response({"message": "Shift created successfully."}, status=status.HTTP_201_CREATED)
#
#     @action(detail=True, methods=['PATCH'])
#     def toggle_pause(self, request, pk):
#         """
#         Переключает состояние смены между "активна" и "приостановлена".
#         """
#         try:
#             shift = self.redis_conn.hgetall(f"shift:{pk}")
#             shift_instance = Shift.objects.get(pk=pk)
#             if shift.get("is_paused") == "0":
#                 self.update_redis(pk, {"is_paused": "1"})
#                 BreakLog.objects.create(shift=shift_instance, start_time=timezone.now())
#                 return Response({"message": "Shift paused successfully."}, status=status.HTTP_200_OK)
#
#             elif shift.get("is_paused") == "1":
#                 self.update_redis(pk, {"is_paused": "0"})
#                 break_log = BreakLog.objects.filter(shift=shift_instance, end_time__isnull=True).first()
#                 break_log.end_time = timezone.now()
#                 break_log.save()
#                 return Response({"message": "Shift resumed successfully."}, status=status.HTTP_200_OK)
#
#             else:
#                 return Response({"message": "Shift not paused."}, status=status.HTTP_400_BAD_REQUEST)
#
#         except Exception as e:
#             logging.error(f"Error in toggle_pause for shift {pk}: {e}")
#             return Response({"error": "An error occurred while toggling shift status."},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)
#
#     @action(detail=True, methods=['PATCH'])
#     def finish(self, request, pk):
#         """
#         Завершает смену, обновляет Redis и сохраняет изменения в базе данных.
#         """
#         try:
#             shift = Shift.objects.get(id=pk)
#
#             shift.status = Shift.Status.COMPLETED
#             shift.ready_value = self.redis_conn.hget(f"shift:{shift.id}", 'ready_value')
#             shift.end_time = timezone.now()
#
#             if shift.user_starts != request.user:
#                 shift.user_ends = request.user
#             shift.save()
#
#             self.update_redis(shift.id, {"status": "COMPLETED"})
#
#             channel_layer = get_channel_layer()
#             async_to_sync(channel_layer.group_send)(
#                 "shifts",
#                 {
#                     "type": "send_shift_update",
#                     "data": {
#                         "id": shift.id,
#                         "status": "COMPLETED",
#                         "reload": True,
#                     }
#                 }
#             )
#
#             return Response({"message": "Shift finished successfully."}, status=status.HTTP_200_OK)
#
#         except Shift.DoesNotExist:
#             return Response({"error": "Shift not found."}, status=status.HTTP_404_NOT_FOUND)
#         except Exception as e:
#             logging.error(f"Error in finish for shift {pk}: {e}")
#             return Response({"error": "An error occurred while finishing the shift."},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PackingLogViewSet(viewsets.ModelViewSet):
    queryset = PackingLog.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = PackingLogSerializer


class CalculatePercentageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        target = request.query_params.get('target')
        packing_id = request.query_params.get('packing_id')

        if not target or not packing_id:
            return Response({"detail": "Обов'язково вкажіть 'target' та 'packing_id'."}, status=status.HTTP_400_BAD_REQUEST)

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
                return Response({"detail": "Норма пакування дорівнює нулю, неможливо розрахувати відсоток."}, status=status.HTTP_400_BAD_REQUEST)

            # Отримуємо тривалість зміни з DefaultSettings
            shift_duration = DefaultSettings.get_shift_duration_in_minute()
            if shift_duration == 0:
                return Response({"detail": "Тривалість зміни дорівнює нулю, неможливо розрахувати відсоток."}, status=status.HTTP_400_BAD_REQUEST)

            # Розраховуємо відсоток на основі вказаного target
            time_needed_in_minute = target / norm_in_minute
            percent_from_shift = (time_needed_in_minute / shift_duration) * 100

            # Повертаємо розрахований відсоток
            return Response({"percentage": percent_from_shift, "time_in_minute": time_needed_in_minute}, status=status.HTTP_200_OK)

        except Packing.DoesNotExist:
            return Response({"detail": "Пакування з вказаним ID не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)