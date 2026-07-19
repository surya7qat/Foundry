from rest_framework import serializers
from .models import (
    Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern,
    MaterialStock, MaterialStockCorrectionLog, ProductStock, ProductStockCorrectionLog,
    PatternLog, CoreBoxLog
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

class CoreBoxLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoreBoxLog
        fields = '__all__'

class CoreBoxSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.CharField(source='customer.code', read_only=True)
    top_core_box_name = serializers.SerializerMethodField()
    bottom_core_box_name = serializers.SerializerMethodField()
    pattern_id = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    last_entry_type = serializers.SerializerMethodField()
    last_inspection_date = serializers.SerializerMethodField()

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

    def get_pattern_id(self, obj):
        pattern = Pattern.objects.filter(core_boxes__contains=obj.id).first()
        return pattern.pattern_id if pattern else None

    def get_current_status(self, obj):
        latest_prod = obj.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            return 'IN_PRODUCTION'
        return 'IN_STOCK'

    def get_last_entry_type(self, obj):
        latest_io = obj.logs.filter(type_of_entry__in=['INWARD', 'OUTWARD']).order_by('-date', '-id').first()
        return latest_io.type_of_entry if latest_io else None

    def get_last_inspection_date(self, obj):
        latest_insp = obj.logs.filter(type_of_entry__in=['INSPECTION', 'INWARD']).order_by('-date', '-id').first()
        return latest_insp.date if latest_insp else None

class PatternSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_code = serializers.CharField(source='customer.code', read_only=True)
    top_plate_name = serializers.SerializerMethodField()
    bottom_plate_name = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    last_entry_type = serializers.SerializerMethodField()
    last_inspection_date = serializers.SerializerMethodField()
    core_boxes_count = serializers.SerializerMethodField()

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

    def get_current_status(self, obj):
        latest_prod = obj.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            return 'IN_PRODUCTION'
        return 'IN_STOCK'

    def get_last_entry_type(self, obj):
        latest_io = obj.logs.filter(type_of_entry__in=['INWARD', 'OUTWARD']).order_by('-date', '-id').first()
        return latest_io.type_of_entry if latest_io else None

    def get_last_inspection_date(self, obj):
        latest_insp = obj.logs.filter(type_of_entry__in=['INSPECTION', 'INWARD']).order_by('-date', '-id').first()
        return latest_insp.date if latest_insp else None

    def get_core_boxes_count(self, obj):
        return len(obj.core_boxes) if obj.core_boxes else 0


class PatternLogSerializer(serializers.ModelSerializer):
    pattern_code = serializers.CharField(source='pattern.pattern_id', read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = PatternLog
        fields = '__all__'

    def get_customer_name(self, obj):
        request = self.context.get('request')
        return mask_customer_name(request, obj.pattern.customer, obj.pattern.customer.name)

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

