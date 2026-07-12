from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, RawMaterialViewSet, CustomerViewSet, PatternMaterialViewSet, ProductViewSet, CoreBoxViewSet, PatternViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'raw-materials', RawMaterialViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'pattern-materials', PatternMaterialViewSet)
router.register(r'products', ProductViewSet)
router.register(r'core-boxes', CoreBoxViewSet)
router.register(r'patterns', PatternViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
