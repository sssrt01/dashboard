import logging

import redis
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class ShiftManager(models.Manager):
    def get_active_shift(self):
        return self.filter(
            status=Shift.Status.ACTIVE
        ).order_by('-start_time').first()


class Master(models.Model):
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Мастера"
        ordering = ['name']

class DefaultSettings(models.Model):
    shift_duration_in_minute = models.IntegerField(default=480) # 8 часов

    @staticmethod
    def get_shift_duration_in_minute():
        return DefaultSettings.objects.first().shift_duration_in_minute if DefaultSettings.objects.exists() else 480

class Product(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Packing(models.Model):
    value = models.FloatField()
    norm = models.PositiveIntegerField()

    def __str__(self):
        return str(self.value)

    def norm_in_minute(self):
        return self.norm / DefaultSettings.get_shift_duration_in_minute()

class ProductPacking(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    packing = models.ForeignKey(Packing, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.product.name} - {self.packing.value} л"



class Shift(models.Model):
    class Status(models.TextChoices):
        PLANNED = 'PLANNED', 'Planed'
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    user_starts = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shift_starts')
    user_ends = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='shift_ends')

    master = models.ForeignKey(Master, on_delete=models.PROTECT, related_name='shifts')

    planned_start_time = models.DateTimeField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=120, choices=Status.choices, default=Status.PLANNED)
    active_task = models.IntegerField(default=0, null=True, blank=True)
    objects = ShiftManager()

    def increment_active_task(self):
        self.active_task += 1
        self.save(update_fields=['active_task'])

    def start_shift(self):
        """Начинает смену, завершая все активные"""
        from .tasks import lead_shift
        self.status = self.Status.ACTIVE
        self.start_time = timezone.now()
        self.save()
        self._initialize_shift_in_redis(self)
        lead_shift.apply_async(args=[self.id])

    def _initialize_shift_in_redis(self, shift):
        from dashboard.repos.redis_repository import RedisRepository
        redis = RedisRepository()
        redis.update_shift_data(self.id, {
            "id": self.id,
            "master": self.master.id,
            "status": self.status,
            "active_task": 0,
        })
        logging.warning(f"Shift {self.id} initialized in Redis TASKS:{self.shifttask_set.all()}")
        for task in self.shifttask_set.all():
            redis.save_task(task)

    @classmethod
    def end_active_shifts(cls):
        """Завершает все активные смены"""
        redis_conn = redis.Redis(
            host=settings.REDIS_CONFIG["HOST"],
            port=settings.REDIS_CONFIG["PORT"],
            db=settings.REDIS_CONFIG["DB"],
            password=settings.REDIS_CONFIG["PASSWORD"],
            decode_responses=True,
        )

        active_shifts = cls.objects.filter(status=cls.Status.ACTIVE)
        for shift in active_shifts:
            shift.status = cls.Status.COMPLETED
            shift.end_time = timezone.now()
            shift.save()
            tasks_list_key = f"shift:{shift.id}:tasks"
            task_ids = redis_conn.lrange(tasks_list_key, 0, -1)
            shift_key = f"shift:{shift.id}"
            for task_id in task_ids:
                try:
                    task_key = f"task:{task_id}"
                    task_data = redis_conn.hgetall(task_key)
                    if task_data:
                        task_defaults = {
                            "time_spent": int(task_data.get("time_spent") or 0),
                            "ready_value": int(task_data.get("ready_value") or 0) if task_data.get(
                                "ready_value") else None,
                            "remaining_time": int(task_data.get("remaining_time") or 0) if task_data.get(
                                "remaining_time") else None,
                            "started_at": task_data.get("started_at"),
                            "finished_at": task_data.get("finished_at"),
                        }
                        ShiftTask.objects.filter(id=task_id).update(**task_defaults)
                        logging.info(f"[TASK {task_id}] Updated in database.")
                        redis_conn.delete(task_key)
                except Exception as e:
                    logging.error(f"[TASK {task_id}] Error updating database: {str(e)}")
                    logging.error(traceback.format_exc())
            redis_conn.delete(shift_key)
            redis_conn.delete(tasks_list_key)

    def __str__(self):
        return f"{self.status}/{self.master.name}/{self.start_time}"

class ShiftTask(models.Model):
    class TaskType(models.TextChoices):
        TASK = 'TASK', 'Task'
        BREAK = 'BREAK', 'Break'

    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)

    type = models.CharField(max_length=120, choices=TaskType.choices, default=TaskType.TASK)
    remaining_time = models.PositiveIntegerField(null=True, blank=True)

    order = models.PositiveIntegerField(default=0) # 0 - первая, 1 - вторая и тд

    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    packing = models.ForeignKey(Packing, on_delete=models.CASCADE, null=True, blank=True)

    target = models.PositiveIntegerField(null=True, blank=True)

    ready_value = models.PositiveIntegerField(null=True, blank=True)
    time_needed = models.PositiveIntegerField(null=True, blank=True)

    norm_in_minute = models.PositiveIntegerField(null=True, blank=True)
    time_spent = models.PositiveBigIntegerField(null=True, blank=True)
    percent_from_shift = models.FloatField(null=True, blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)


class PackingLog(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, null=True, blank=True)
    task = models.ForeignKey(ShiftTask, on_delete=models.CASCADE, null=True, blank=True)
    sid = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Добавьте это поле

    def __str__(self):
        return f"{self.shift.name + ' ' + str(self.shift.id)}/{self.task.id}"


class BreakLog(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.start_time} - {self.end_time}/ {self.shift}"
