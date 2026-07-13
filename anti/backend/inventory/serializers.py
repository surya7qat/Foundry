from rest_framework import serializers
from .models import (
    Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern,
    MaterialStock, MaterialStockCorrectionLog, ProductStock, ProductStockCorrectionLog
)
def mask_customer_name(request, customer_obj, default_name):
    if not request or not request.user or request.user.is_superuser:
        return default_name
    if not getattr(request.user, 'show_customer_to_all_departments', True):
        return '***'
    return default_name

def mask_supplier_name(request, supplier_obj, default_name):
    if not request or not request.user or request.user.is_superuser:
        return default_name
    if not getattr(request.user, 'show_supplier_to_all_departments', True):
        return '***'
    return default_name

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        data['name'] = mask_supplier_name(request, instance, instance.name)
        return data

class RawMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterial
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        data['name'] = mask_customer_name(request, instance, instance.name)
        return data

class PatternMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatternMaterial
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.customer, obj.customer.name)

class CoreBoxSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    top_core_box_name = serializers.SerializerMethodField()
    bottom_core_box_name = serializers.SerializerMethodField()

    class Meta:
        model = CoreBox
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.customer, obj.customer.name)

    def get_top_core_box_name(self, obj):
        return obj.top_core_box.name if obj.top_core_box else None

    def get_bottom_core_box_name(self, obj):
        return obj.bottom_core_box.name if obj.bottom_core_box else None

class PatternSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    top_plate_name = serializers.SerializerMethodField()
    bottom_plate_name = serializers.SerializerMethodField()

    class Meta:
        model = Pattern
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.customer, obj.customer.name)

    def get_top_plate_name(self, obj):
        return obj.top_plate.name if obj.top_plate else None

    def get_bottom_plate_name(self, obj):
        return obj.bottom_plate.name if obj.bottom_plate else None

# Material Stock Serializers
class MaterialStockSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source='raw_material.name', read_only=True)
    raw_material_code = serializers.CharField(source='raw_material.code', read_only=True)
    material_unit = serializers.CharField(source='raw_material.unit', read_only=True)
    material_category = serializers.CharField(source='raw_material.category', read_only=True)

    class Meta:
        model = MaterialStock
        fields = '__all__'

class MaterialStockCorrectionLogSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source='raw_material.name', read_only=True)
    raw_material_code = serializers.CharField(source='raw_material.code', read_only=True)
    material_unit = serializers.CharField(source='raw_material.unit', read_only=True)

    class Meta:
        model = MaterialStockCorrectionLog
        fields = '__all__'

# Product Stock Serializers
class ProductStockSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.CharField(source='customer.code', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.product_id', read_only=True)

    class Meta:
        model = ProductStock
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.customer, obj.customer.name)

class ProductStockCorrectionLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.CharField(source='customer.code', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.product_id', read_only=True)

    class Meta:
        model = ProductStockCorrectionLog
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.customer, obj.customer.name)

