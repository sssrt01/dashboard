from django.db import migrations, models


def copy_norm_in_minute(apps, schema_editor):
    Packing = apps.get_model('dashboard', 'Packing')
    DefaultSettings = apps.get_model('dashboard', 'DefaultSettings')
    ShiftTask = apps.get_model('dashboard', 'ShiftTask')

    default_duration = DefaultSettings.objects.first().shift_duration_in_minute if DefaultSettings.objects.exists() else 480

    for task in ShiftTask.objects.all():
        if task.packing:
            task.norm_in_minute = task.packing.norm / default_duration
            task.save()


class Migration(migrations.Migration):
    dependencies = [
        ('dashboard', '0012_add_created_at_to_packinglog'),
    ]

    operations = [
        migrations.AddField(  # Сначала добавляем поле
            model_name='shifttask',
            name='norm_in_minute',
            field=models.FloatField(null=True, blank=True),
        ),
        migrations.RunPython(copy_norm_in_minute, migrations.RunPython.noop),
    ]
