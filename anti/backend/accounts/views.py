from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from .serializers import (
    CustomTokenObtainPairSerializer,
    RoleSerializer,
    UserReadOnlySerializer,
    UserCreateSerializer,
    UserAccessPermissionSerializer
)
from .models import Role, UserAccessPermission, CustomUser

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class IsCentralAdmin(BasePermission):
    """Allows access only to authenticated superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

from django.db.models import Q

class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsCentralAdmin]

    def get_queryset(self):
        qs = Role.objects.filter(client=self.request.user.client)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsCentralAdmin]

    def get_queryset(self):
        qs = CustomUser.objects.filter(client=self.request.user.client).exclude(id=self.request.user.id)
        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(role__name__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateSerializer
        return UserReadOnlySerializer

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client)

class UserAccessPermissionView(APIView):
    permission_classes = [IsAuthenticated, IsCentralAdmin]

    def get(self, request):
        if not request.user.client:
            return Response({"detail": "User has no client associated."}, status=status.HTTP_400_BAD_REQUEST)
        perm, _ = UserAccessPermission.objects.get_or_create(client=request.user.client)
        serializer = UserAccessPermissionSerializer(perm)
        return Response(serializer.data)

    def put(self, request):
        if not request.user.client:
            return Response({"detail": "User has no client associated."}, status=status.HTTP_400_BAD_REQUEST)
        perm, _ = UserAccessPermission.objects.get_or_create(client=request.user.client)
        serializer = UserAccessPermissionSerializer(perm, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(client=request.user.client)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
