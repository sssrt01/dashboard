
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from dashboard.router import router
from dashboard.views import LastTenShiftsView, CalculatePercentageView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/last-ten-shifts/', LastTenShiftsView.as_view(), name='last-ten-shifts'),
    path('api/calculate-percentage/', CalculatePercentageView.as_view(), name='calculate_percentage'),

]
