from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SupplierViewSet, RawMaterialViewSet, CustomerViewSet, PatternMaterialViewSet, ProductViewSet, CoreBoxViewSet, PatternViewSet,
    MaterialStockViewSet, MaterialStockCorrectionLogViewSet, ProductStockViewSet, ProductStockCorrectionLogViewSet
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'raw-materials', RawMaterialViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'pattern-materials', PatternMaterialViewSet)
router.register(r'products', ProductViewSet)
router.register(r'core-boxes', CoreBoxViewSet)
router.register(r'patterns', PatternViewSet)
router.register(r'material-stock', MaterialStockViewSet)
router.register(r'material-stock-correction-log', MaterialStockCorrectionLogViewSet)
router.register(r'product-stock', ProductStockViewSet)
router.register(r'product-stock-correction-log', ProductStockCorrectionLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
