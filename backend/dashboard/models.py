from django.contrib.auth.models import User
from django.db import models

class ShiftManager(models.Manager):
    def get_active_shift(self):
        return self.filter(
            status=Shift.Status.ACTIVE
        ).order_by('-start_time').first()


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
        ACTIVE = 'ACTIVE', 'Active'
        PAUSED = 'PAUSED', 'Paused'
        COMPLETED = 'COMPLETED', 'Completed'

    user_starts = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shift_starts')
    user_ends = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='shift_ends')

    name = models.CharField(max_length=120)

    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=120, choices=Status.choices, default=Status.ACTIVE)
    active_task = models.IntegerField(default=0, null=True, blank=True)
    objects = ShiftManager()

    def increment_active_task(self):
        self.active_task += 1
        self.save(update_fields=['active_task'])

    def __str__(self):
        return f"{self.status}/{self.name}/{self.start_time}"

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