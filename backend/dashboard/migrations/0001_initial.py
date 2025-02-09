# Generated by Django 5.1.4 on 2025-01-08 17:05

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Packing',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.FloatField()),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dashboard.product')),
            ],
        ),
        migrations.CreateModel(
            name='Shift',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('target_value', models.IntegerField()),
                ('ready_value', models.IntegerField(default=0)),
                ('shift_time', models.PositiveBigIntegerField()),
                ('start_time', models.DateTimeField(auto_now_add=True)),
                ('end_time', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('PAUSED', 'Paused'), ('COMPLETED', 'Completed')], default='ACTIVE', max_length=120)),
                ('packing', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dashboard.packing')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dashboard.product')),
            ],
        ),
        migrations.CreateModel(
            name='PackingLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sid', models.IntegerField()),
                ('shift', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dashboard.shift')),
            ],
        ),
        migrations.CreateModel(
            name='BreakLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.DateTimeField(auto_now_add=True)),
                ('end_time', models.DateTimeField()),
                ('shift', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dashboard.shift')),
            ],
        ),
    ]
