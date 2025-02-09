# Generated by Django 5.1.4 on 2025-01-22 11:19

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0004_remove_packing_product_productpacking'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='shift',
            name='user_ends',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='shift_ends', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='shift',
            name='user_starts',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='shift_starts', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
    ]
