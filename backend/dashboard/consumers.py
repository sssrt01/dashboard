import json
import redis
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.conf import settings

from dashboard.models import Shift


class ShiftConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        При подключении веб-сокета:
        1. Устанавливаем соединение с Redis.
        2. Получаем активный идентификатор смены (предполагается, что он хранится в Redis под ключом 'active_shift').
        3. Если активная смена найдена, подписываемся на группу и отправляем клиенту данные смены,
           извлечённые из Redis, а также список заданий, привязанных к этой смене.
        """
        # Инициализируем соединение с Redis с использованием настроек из settings
        self.redis_conn = redis.Redis(
            host=settings.REDIS_CONFIG["HOST"],
            port=settings.REDIS_CONFIG["PORT"],
            db=settings.REDIS_CONFIG["DB"],
            password=settings.REDIS_CONFIG.get("PASSWORD"),
            decode_responses=True,
        )

        active_shift = await sync_to_async(
            lambda: Shift.objects.filter(status=Shift.Status.ACTIVE).order_by("-id").first()
        )()
        # Предполагаем, что идентификатор активной смены хранится под ключом "active_shift"
        #active_shift = self.redis_conn.get("active_shift")
        if active_shift:
            self.shift_id = active_shift.id
            self.group_name = f"shift_{self.shift_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

            # Получаем данные смены из Redis по ключу "shift:{shift_id}"
            shift_key = f"shift:{self.shift_id}"
            shift_data = self.redis_conn.hgetall(shift_key)

            # Получаем список идентификаторов заданий для данной смены
            tasks_list_key = f"shift:{self.shift_id}:tasks"
            tasks = self.redis_conn.lrange(tasks_list_key, 0, -1)

            shift_tasks = []

            # Перебор всех задач
            for task in tasks:
                task_data = self.redis_conn.hgetall(f"task:{task}")

                # Для каждой задачи извлекаем нужные поля
                task_info = {}
                for key in task_data:
                    # Преобразуем байтовые строки в нормальные строки (если нужно)
                    task_info[key] = task_data[key]

                shift_tasks.append(task_info)

            # Отправляем клиенту начальные данные
            payload = {
                "shift": shift_data,
                "tasks": shift_tasks,
            }
            await self.send(text_data=json.dumps({
                "type": "shift_init",
                "data": payload,
            }))
        else:
            # Если активная смена не найдена — закрываем соединение
            await self.close()

    async def disconnect(self, close_code):
        """
        При отключении убираем соединение из группы смены.
        """
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Обработка входящих сообщений от клиента (например, подтверждение или команды).
        В данный момент сообщение просто логируется.
        """
        data = json.loads(text_data)
        print("Получено сообщение от клиента:", data)

    async def task_update(self, event):
        """
        Обработчик обновлений заданий, приходящих, например, из Celery-задачи.
        Ожидается, что event содержит ключи:
          - event: тип события (start, update, finish)
          - task_id: идентификатор задания
          - data: обновлённые данные задания
        """
        await self.send(text_data=json.dumps({
            "type": "task_update",
            "event": event.get("event"),
            "task_id": event.get("task_id"),
            "data": event.get("data"),
        }))

    async def shift_update(self, event):
        """
        Обработчик обновлений смены, например, сообщение о завершении смены.
        Ожидается, что event содержит:
          - event: тип события (например, completed)
          - data: данные, связанные со сменой
        """
        await self.send(text_data=json.dumps({
            "type": "shift_update",
            "event": event.get("event"),
            "data": event.get("data"),
        }))
