from rest_framework import serializers
from .models import Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class RawMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterial
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class PatternMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatternMaterial
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    class Meta:
        model = Product
        fields = '__all__'

class CoreBoxSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    top_core_box_name = serializers.SerializerMethodField()
    bottom_core_box_name = serializers.SerializerMethodField()

    class Meta:
        model = CoreBox
        fields = '__all__'

    def get_top_core_box_name(self, obj):
        return obj.top_core_box.name if obj.top_core_box else None

    def get_bottom_core_box_name(self, obj):
        return obj.bottom_core_box.name if obj.bottom_core_box else None

class PatternSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    top_plate_name = serializers.SerializerMethodField()
    bottom_plate_name = serializers.SerializerMethodField()

    class Meta:
        model = Pattern
        fields = '__all__'

    def get_top_plate_name(self, obj):
        return obj.top_plate.name if obj.top_plate else None

    def get_bottom_plate_name(self, obj):
        return obj.bottom_plate.name if obj.bottom_plate else None
