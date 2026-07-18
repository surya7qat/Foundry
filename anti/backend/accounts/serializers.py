from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import Role, UserAccessPermission, CustomUser

def get_user_permissions(user):
    perms = {
        'can_access_dashboard': True,
        'can_access_supplier_master': False,
        'can_access_raw_material_master': False,
        'can_access_customer_master': False,
        'can_access_pattern_material_master': False,
        'can_access_product_master': False,
        'can_access_core_box_master': False,
        'can_access_pattern_master': False,
        'can_access_purchase_inward': False,
        'can_access_purchase_rejection': False,
        'can_access_purchase_return': False,
        'can_access_material_stock': False,
        'can_access_material_stock_log': False,
        'can_access_product_stock': False,
        'can_access_product_stock_log': False,
        'can_access_pattern_flow': False,
    }
    if user.is_superuser:
        for k in perms.keys():
            perms[k] = True
    elif user.role:
        role = user.role
        perms['can_access_dashboard'] = role.can_access_dashboard
        perms['can_access_supplier_master'] = role.can_access_supplier_master
        perms['can_access_raw_material_master'] = role.can_access_raw_material_master
        perms['can_access_customer_master'] = role.can_access_customer_master
        perms['can_access_pattern_material_master'] = role.can_access_pattern_material_master
        perms['can_access_product_master'] = role.can_access_product_master
        perms['can_access_core_box_master'] = role.can_access_core_box_master
        perms['can_access_pattern_master'] = role.can_access_pattern_master
        perms['can_access_purchase_inward'] = role.can_access_purchase_inward
        perms['can_access_purchase_rejection'] = role.can_access_purchase_rejection
        perms['can_access_purchase_return'] = role.can_access_purchase_return
        perms['can_access_material_stock'] = role.can_access_material_stock
        perms['can_access_material_stock_log'] = role.can_access_material_stock_log
        perms['can_access_product_stock'] = role.can_access_product_stock
        perms['can_access_product_stock_log'] = role.can_access_product_stock_log
        perms['can_access_pattern_flow'] = role.can_access_pattern_flow
    return perms

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_superuser'] = user.is_superuser
        if user.client:
            token['client_name'] = user.client.name
            token['api_endpoint'] = user.client.api_endpoint
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['is_superuser'] = self.user.is_superuser
        data['role_permissions'] = get_user_permissions(self.user)
        data['show_customer_to_all_departments'] = self.user.show_customer_to_all_departments
        data['show_supplier_to_all_departments'] = self.user.show_supplier_to_all_departments
        if self.user.client:
            data['api_endpoint'] = self.user.client.api_endpoint
            data['client_name'] = self.user.client.name
        return data

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['client']

class UserReadOnlySerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'role_name', 'is_active', 'is_superuser', 'show_customer_to_all_departments', 'show_supplier_to_all_departments']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'role', 'is_active', 'show_customer_to_all_departments', 'show_supplier_to_all_departments']
        
    def create(self, validated_data):
        password = validated_data.pop('password', '')
        user = CustomUser(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class UserAccessPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccessPermission
        fields = '__all__'
        read_only_fields = ['client']
