from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserViewSet, UserAccessPermissionView

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='role')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('permissions/', UserAccessPermissionView.as_view(), name='permissions'),
]
