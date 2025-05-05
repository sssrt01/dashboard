
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from dashboard.router import router
from dashboard.views import CalculatePercentageView, IncrementActiveTaskView, ActiveShiftView, ShiftListAPI, \
    ShiftDetailAPIView, shifts_statistics

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/shift/active/', ActiveShiftView.as_view(), name='active-shift'),
    path('api/table/', ShiftListAPI.as_view(), name='shift-table'),
    path('api/shifts_detail/<int:id>/', ShiftDetailAPIView.as_view(), name='shift-detail'),
    path('api/shifts/statistics/', shifts_statistics, name='shifts-statistics'),

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/calculate-percentage/', CalculatePercentageView.as_view(), name='calculate_percentage'),
    path('api/shift/increment-active-task/', IncrementActiveTaskView.as_view(), name='increment-active-task'),
]
