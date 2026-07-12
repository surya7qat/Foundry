from rest_framework import serializers
from django.db import models
from .models import (
    PurchaseInward, PurchaseInwardItem,
    PurchaseRejection, PurchaseRejectionItem,
    PurchaseReturn, PurchaseReturnItem
)
from inventory.models import Supplier, RawMaterial

# Inward Item Serializer
class PurchaseInwardItemSerializer(serializers.ModelSerializer):
    raw_material_code = serializers.CharField(source='raw_material.code', read_only=True)
    raw_material_name = serializers.CharField(source='raw_material.name', read_only=True)
    cgst = serializers.FloatField(read_only=True)
    sgst = serializers.FloatField(read_only=True)
    sub_total = serializers.FloatField(read_only=True)
    batch = serializers.CharField(required=False, allow_blank=True, default='')
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)

    class Meta:
        model = PurchaseInwardItem
        fields = [
            'id', 'raw_material', 'raw_material_code', 'raw_material_name',
            'quantity', 'rate', 'gst', 'cgst', 'sgst', 'batch', 'expiry_date',
            'amount', 'sub_total'
        ]
        read_only_fields = ['cgst', 'sgst', 'amount', 'sub_total']

# Inward Serializer
class PurchaseInwardSerializer(serializers.ModelSerializer):
    items = PurchaseInwardItemSerializer(many=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = PurchaseInward
        fields = [
            'id', 'inward_number', 'supplier', 'supplier_name', 'inward_date',
            'bill_no', 'bill_date', 'remarks', 'status', 'items', 'created_at', 'created_by'
        ]
        read_only_fields = ['inward_number', 'created_at', 'created_by']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Auto-generate Inward Number
        last_inw = PurchaseInward.objects.order_by('-id').first()
        new_id = last_inw.id + 1 if last_inw else 1
        validated_data['inward_number'] = f"INW-2026-{new_id:04d}"
        
        purchase_inward = PurchaseInward.objects.create(**validated_data)
        
        for item_data in items_data:
            qty = item_data.get('quantity')
            rate = item_data.get('rate')
            gst = item_data.get('gst', 18.0)
            amount = qty * rate
            cgst = (amount * (gst / 100.0)) / 2.0
            sgst = (amount * (gst / 100.0)) / 2.0
            
            PurchaseInwardItem.objects.create(
                purchase_inward=purchase_inward,
                raw_material=item_data['raw_material'],
                quantity=qty,
                rate=rate,
                gst=gst,
                cgst=cgst,
                sgst=sgst,
                batch=item_data.get('batch', ''),
                expiry_date=item_data.get('expiry_date', None)
            )
            
        return purchase_inward

    def update(self, instance, validated_data):
        if instance.status == 'COMPLETED':
            raise serializers.ValidationError("Cannot edit a completed purchase inward.")
            
        items_data = validated_data.pop('items', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                qty = item_data.get('quantity')
                rate = item_data.get('rate')
                gst = item_data.get('gst', 18.0)
                amount = qty * rate
                cgst = (amount * (gst / 100.0)) / 2.0
                sgst = (amount * (gst / 100.0)) / 2.0
                
                PurchaseInwardItem.objects.create(
                    purchase_inward=instance,
                    raw_material=item_data['raw_material'],
                    quantity=qty,
                    rate=rate,
                    gst=gst,
                    cgst=cgst,
                    sgst=sgst,
                    batch=item_data.get('batch', ''),
                    expiry_date=item_data.get('expiry_date', None)
                )
                
        return instance

# Rejection Item Serializer
class PurchaseRejectionItemSerializer(serializers.ModelSerializer):
    raw_material_code = serializers.CharField(source='raw_material.code', read_only=True)
    raw_material_name = serializers.CharField(source='raw_material.name', read_only=True)

    class Meta:
        model = PurchaseRejectionItem
        fields = ['id', 'purchase_inward_item', 'raw_material', 'raw_material_code', 'raw_material_name', 'rejected_quantity', 'rate', 'gst', 'cgst', 'sgst', 'amount']
        read_only_fields = ['gst', 'cgst', 'sgst', 'amount']

# Rejection Serializer
class PurchaseRejectionSerializer(serializers.ModelSerializer):
    items = PurchaseRejectionItemSerializer(many=True)
    supplier_name = serializers.CharField(source='purchase_inward.supplier.name', read_only=True)
    inward_number = serializers.CharField(source='purchase_inward.inward_number', read_only=True)

    class Meta:
        model = PurchaseRejection
        fields = ['id', 'rejection_number', 'rejection_date', 'purchase_inward', 'inward_number', 'supplier_name', 'remarks', 'items', 'created_at', 'created_by']
        read_only_fields = ['rejection_number', 'created_at', 'created_by']

    def validate(self, data):
        inward = data['purchase_inward']
        if inward.status != 'COMPLETED':
            raise serializers.ValidationError("Cannot perform QC rejection on a Draft Purchase Inward. It must be Completed first.")
        items_data = data['items']
        
        inward_items_map = {item.id: item for item in inward.items.all()}
        
        for item in items_data:
            inward_item = item.get('purchase_inward_item')
            rejected_qty = item['rejected_quantity']
            material = item['raw_material']
            
            if not inward_item or inward_item.id not in inward_items_map:
                raise serializers.ValidationError("Inward line item is invalid or not part of this Inward.")
                
            if rejected_qty <= 0:
                raise serializers.ValidationError("Rejected quantity must be greater than 0.")
                
            # Aggregate previously rejected quantities for this specific Inward Item
            already_rejected = PurchaseRejectionItem.objects.filter(
                purchase_inward_item=inward_item
            ).exclude(id=item.get('id')).aggregate(total=models.Sum('rejected_quantity'))['total'] or 0.0
            
            max_rejectable = inward_item.quantity - already_rejected
            if rejected_qty > max_rejectable:
                raise serializers.ValidationError(
                    f"Rejected quantity ({rejected_qty}) for {inward_item.raw_material.code} cannot exceed remaining inward quantity ({max_rejectable})."
                )
                
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Auto-generate Rejection Number
        last_rej = PurchaseRejection.objects.order_by('-id').first()
        new_id = last_rej.id + 1 if last_rej else 1
        validated_data['rejection_number'] = f"REJ-2026-{new_id:04d}"
        
        rejection = PurchaseRejection.objects.create(**validated_data)
        for item_data in items_data:
            inward_item = item_data['purchase_inward_item']
            rejected_quantity = item_data['rejected_quantity']
            rate = item_data['rate']
            material = item_data['raw_material']
            
            gst = inward_item.gst if inward_item else 18.0
            amount = rejected_quantity * rate
            cgst = (amount * (gst / 100.0)) / 2.0
            sgst = (amount * (gst / 100.0)) / 2.0
            
            PurchaseRejectionItem.objects.create(
                purchase_rejection=rejection,
                purchase_inward_item=inward_item,
                raw_material=material,
                rejected_quantity=rejected_quantity,
                rate=rate,
                gst=gst,
                cgst=cgst,
                sgst=sgst
            )
            
        return rejection

# Return Item Serializer
class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    raw_material_code = serializers.CharField(source='raw_material.code', read_only=True)
    raw_material_name = serializers.CharField(source='raw_material.name', read_only=True)

    class Meta:
        model = PurchaseReturnItem
        fields = ['id', 'purchase_inward_item', 'raw_material', 'raw_material_code', 'raw_material_name', 'returned_quantity', 'rate', 'gst', 'cgst', 'sgst', 'amount']
        read_only_fields = ['gst', 'cgst', 'sgst', 'amount']

# Return Serializer
class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True)
    supplier_name = serializers.CharField(source='purchase_inward.supplier.name', read_only=True)
    inward_number = serializers.CharField(source='purchase_inward.inward_number', read_only=True)

    class Meta:
        model = PurchaseReturn
        fields = ['id', 'return_number', 'return_date', 'purchase_inward', 'inward_number', 'supplier_name', 'remarks', 'items', 'created_at', 'created_by']
        read_only_fields = ['return_number', 'created_at', 'created_by']

    def validate(self, data):
        inward = data['purchase_inward']
        if inward.status != 'COMPLETED':
            raise serializers.ValidationError("Cannot perform return on a Draft Purchase Inward. It must be Completed first.")
        items_data = data['items']
        
        inward_items_map = {item.id: item for item in inward.items.all()}
        
        for item in items_data:
            inward_item = item.get('purchase_inward_item')
            returned_qty = item['returned_quantity']
            material = item['raw_material']
            
            if not inward_item or inward_item.id not in inward_items_map:
                raise serializers.ValidationError("Inward line item is invalid or not part of this Inward.")
                
            if returned_qty <= 0:
                raise serializers.ValidationError("Returned quantity must be greater than 0.")
                
            # Aggregate previously rejected quantities for this specific Inward Item
            already_rejected = PurchaseRejectionItem.objects.filter(
                purchase_inward_item=inward_item
            ).aggregate(total=models.Sum('rejected_quantity'))['total'] or 0.0
            
            # Aggregate previously returned quantities for this specific Inward Item
            already_returned = PurchaseReturnItem.objects.filter(
                purchase_inward_item=inward_item
            ).exclude(id=item.get('id')).aggregate(total=models.Sum('returned_quantity'))['total'] or 0.0
            
            max_returnable = inward_item.quantity - already_rejected - already_returned
            if returned_qty > max_returnable:
                raise serializers.ValidationError(
                    f"Returned quantity ({returned_qty}) for {inward_item.raw_material.code} cannot exceed remaining accepted quantity ({max_returnable:.2f})."
                )
                
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Auto-generate Return Number
        last_ret = PurchaseReturn.objects.order_by('-id').first()
        new_id = last_ret.id + 1 if last_ret else 1
        validated_data['return_number'] = f"RET-2026-{new_id:04d}"
        
        purchase_return = PurchaseReturn.objects.create(**validated_data)
        for item_data in items_data:
            inward_item = item_data['purchase_inward_item']
            returned_quantity = item_data['returned_quantity']
            rate = item_data['rate']
            material = item_data['raw_material']
            
            gst = inward_item.gst if inward_item else 18.0
            amount = returned_quantity * rate
            cgst = (amount * (gst / 100.0)) / 2.0
            sgst = (amount * (gst / 100.0)) / 2.0
            
            PurchaseReturnItem.objects.create(
                purchase_return=purchase_return,
                purchase_inward_item=inward_item,
                raw_material=material,
                returned_quantity=returned_quantity,
                rate=rate,
                gst=gst,
                cgst=cgst,
                sgst=sgst
            )
            
        return purchase_return
