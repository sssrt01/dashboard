from django.db import migrations, models
from django.utils import timezone


def set_created_at(apps, schema_editor):
    PackingLog = apps.get_model('dashboard', 'PackingLog')
    for log in PackingLog.objects.all():
        log.created_at = log.shift.start_time if log.shift else timezone.now()
        log.save()


class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0011_rename_time_needed_in_minute_shifttask_time_needed'),
    ]

    operations = [
        # Сначала добавляем поле, которое может быть null
        migrations.AddField(
            model_name='packinglog',
            name='created_at',
            field=models.DateTimeField(null=True),
        ),
        # Заполняем данные
        migrations.RunPython(set_created_at, migrations.RunPython.noop),
        # Делаем поле обязательным и устанавливаем auto_now_add
        migrations.AlterField(
            model_name='packinglog',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
