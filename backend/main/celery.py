import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main.settings')

app = Celery('main')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
app.conf.beat_schedule = {
    'check-shifts-every-minute': {
        'task': 'dashboard.tasks.check_and_start_shifts',
        'schedule': crontab(minute='*'),  # Выполняется каждую минуту
    },
}
