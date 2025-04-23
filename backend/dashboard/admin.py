from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .forms import CustomUserCreationForm
from .models import Product, Packing, Shift, PackingLog, BreakLog, ProductPacking, ShiftTask, DefaultSettings


class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
    )


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


class ProductPackingInline(admin.TabularInline):
    model = ProductPacking
    extra = 1
    # Добавляем валидацию на уникальность комбинации
    validate_min = True
    
class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductPackingInline]
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)
    list_per_page = 50

class PackingAdmin(admin.ModelAdmin):
    list_display = ('value', 'norm', 'norm_in_minute')
    list_filter = ('value',)
    search_fields = ('value',)
    ordering = ('value',)
    list_per_page = 50


class ShiftTaskInline(admin.TabularInline):
    model = ShiftTask
    extra = 0
    fields = ('type', 'product', 'packing', 'target', 'order', 'status')
    ordering = ('order',)

class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_time', 'end_time', 'user_starts', 'get_products', 'get_packings')
    search_fields = ('name', 'user_starts__username')
    list_filter = ('status', 'start_time', 'user_starts')
    date_hierarchy = 'start_time'
    inlines = [ShiftTaskInline]
    list_per_page = 50
    ordering = ('-start_time',)
    readonly_fields = ('start_time',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related(
            'shifttask_set__product',
            'shifttask_set__packing'
        ).select_related('user_starts', 'user_ends')

    def get_products(self, obj):
        tasks = obj.shifttask_set.filter(product__isnull=False, type=ShiftTask.TaskType.TASK)
        return ", ".join([str(task.product.name) for task in tasks if task.product])
    get_products.short_description = 'Products'

    def get_packings(self, obj):
        tasks = obj.shifttask_set.filter(packing__isnull=False, type=ShiftTask.TaskType.TASK)
        return ", ".join([str(task.packing.value) for task in tasks if task.packing])
    get_packings.short_description = 'Packings'

class PackingLogAdmin(admin.ModelAdmin):
    list_display = ('get_shift_name', 'sid', 'task', 'created_at')
    search_fields = ('shift__name', 'sid')
    list_filter = ('shift', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50
    ordering = ('-created_at',)
    readonly_fields = ('shift', 'task', 'sid', 'created_at')

    def get_shift_name(self, obj):
        return obj.shift.name if obj.shift else 'No shift'
    get_shift_name.short_description = 'Shift'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('shift', 'task')

class BreakLogAdmin(admin.ModelAdmin):
    list_display = ('get_shift_name', 'start_time', 'end_time', 'get_duration')
    search_fields = ('shift__name',)
    list_filter = ('shift', 'start_time')
    date_hierarchy = 'start_time'
    list_per_page = 50
    ordering = ('-start_time',)
    readonly_fields = ('start_time',)

    def get_shift_name(self, obj):
        return obj.shift.name if obj.shift else 'No shift'

    get_shift_name.short_description = 'Shift'

    def get_duration(self, obj):
        if obj.end_time and obj.start_time:
            duration = obj.end_time - obj.start_time
            return str(duration).split('.')[0]  # Убираем миллисекунды
        return 'In progress'

    get_duration.short_description = 'Duration'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('shift')


class ShiftTaskAdmin(admin.ModelAdmin):
    list_display = ('shift', 'type', 'product', 'packing', 'order', 'target', 'ready_value', 'started_at',
                    'finished_at')
    list_filter = ('type', 'shift', 'product', 'packing')
    search_fields = ('shift__name', 'product__name')
    date_hierarchy = 'started_at'
    ordering = ('shift', 'order')
    list_per_page = 50
    readonly_fields = ('time_spent', 'started_at', 'finished_at')


class DefaultSettingsAdmin(admin.ModelAdmin):
    list_display = ('shift_duration_in_minute',)

admin.site.register(Product, ProductAdmin)
admin.site.register(Packing, PackingAdmin)
admin.site.register(Shift, ShiftAdmin)
admin.site.register(PackingLog, PackingLogAdmin)
admin.site.register(BreakLog, BreakLogAdmin)
admin.site.register(ShiftTask, ShiftTaskAdmin)
admin.site.register(DefaultSettings, DefaultSettingsAdmin)