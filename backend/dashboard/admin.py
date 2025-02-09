from django.contrib import admin
from .models import Product, Packing, Shift, PackingLog, BreakLog, ProductPacking


class ProductPackingInline(admin.TabularInline):  # Или StackedInline
    model = ProductPacking
    extra = 1


class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductPackingInline]


class PackingAdmin(admin.ModelAdmin):
    list_display = ('value',)
    list_filter = ('value',)


class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_time', 'end_time', 'get_products', 'get_packings')
    search_fields = ('name', 'shift_tasks__product__name', 'shift_tasks__packing__value')
    list_filter = ('status',)

    def get_products(self, obj):
        return ", ".join([str(task.product.name) for task in obj.shifttask_set.all()])
    get_products.short_description = 'Products'

    def get_packings(self, obj):
        return ", ".join([str(task.packing.value) for task in obj.shifttask_set.all()])
    get_packings.short_description = 'Packings'


class PackingLogAdmin(admin.ModelAdmin):
    list_display = ('shift', 'sid')
    search_fields = ('shift__name',)


class BreakLogAdmin(admin.ModelAdmin):
    list_display = ('shift', 'start_time', 'end_time')
    search_fields = ('shift__name',)
    list_filter = ('shift',)


admin.site.register(Product, ProductAdmin)
admin.site.register(Packing, PackingAdmin)
admin.site.register(Shift, ShiftAdmin)
admin.site.register(PackingLog, PackingLogAdmin)
admin.site.register(BreakLog, BreakLogAdmin)





