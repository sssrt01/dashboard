from django.urls import re_path
from rest_framework import routers

from .consumers import ShiftConsumer
from .views import ProductViewSet, PackageViewSet, ShiftViewSet, PackingLogViewSet, ShiftTaskViewSet, MasterViewSet

router = routers.SimpleRouter()
router.register(r'products', ProductViewSet)
router.register(r'packages', PackageViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'tasks', ShiftTaskViewSet, basename='task')
router.register(r'masters', MasterViewSet, basename='master')
router.register(r'packing_log', PackingLogViewSet, basename='packing_log')

websocket_urlpatterns = [
    re_path(r'ws/shifts/$', ShiftConsumer.as_asgi()),
]