# Generated by Django 5.1.4 on 2025-01-29 20:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0006_defaultsettings_remove_shift_packing_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='shifttask',
            name='percent_from_shift',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shifttask',
            name='time_needed_in_minute',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
