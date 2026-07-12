from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseInwardViewSet, PurchaseRejectionViewSet, PurchaseReturnViewSet

router = DefaultRouter()
router.register(r'purchase-inwards', PurchaseInwardViewSet)
router.register(r'purchase-rejections', PurchaseRejectionViewSet)
router.register(r'purchase-returns', PurchaseReturnViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
