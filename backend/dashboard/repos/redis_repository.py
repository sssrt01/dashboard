import logging

import redis
from django.conf import settings

from dashboard.models import Product, ProductPacking


class RedisRepository:
    def __init__(self):
        self.conn = redis.Redis(
            host=settings.REDIS_CONFIG["HOST"],
            port=settings.REDIS_CONFIG["PORT"],
            db=settings.REDIS_CONFIG["DB"],
            password=settings.REDIS_CONFIG["PASSWORD"],
            decode_responses=True,
        )

    def update_shift_data(self, shift_id, data):
        try:
            self.conn.hset(f"shift:{shift_id}", mapping=data)
        except Exception as e:
            logging.exception(f"Redis shift update error for shift {shift_id}")
            raise

    def increment_task_value(self, task_id, field, value=1):
        try:
            self.conn.hincrby(f"task:{task_id}", field, value)
        except Exception as e:
            logging.exception(f"Redis error incrementing {field} for task {task_id}")
            raise

    def save_task(self, task):
        task_data = self._prepare_task_data(task)
        try:
            self.conn.hset(f"task:{task.id}", mapping=task_data)
            self.conn.rpush(f"shift:{task.shift_id}:tasks", task.id)
        except Exception as e:
            logging.exception(f"Redis error saving task {task.id}")
            raise

    def _prepare_task_data(self, task):
        if task.type == "TASK":
            product = Product.objects.get(id=task.product_id)
            packing = ProductPacking.objects.get(id=task.packing_id)
            return {
                "id": task.id,
                "type": task.type,
                "order": task.order,
                "target": task.target,
                "ready_value": 0,
                "product": str(product),
                "packing": str(packing.packing.value),
                "shift": task.shift_id,
                "norm_in_minute": task.packing.norm_in_minute() if task.packing else 0
            }
        return {
            "id": task.id,
            "type": task.type,
            "order": task.order,
            "remaining_time": task.remaining_time * 60,
            "shift": task.shift_id,
        }

    def get_active_task_index(self, shift_id):
        try:
            return int(self.conn.hget(f"shift:{shift_id}", "active_task") or 0)
        except ValueError:
            return 0