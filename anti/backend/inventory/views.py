from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django.db import models
from django.utils import timezone
from django.db.models import Q
from .models import (
    Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern,
    MaterialStock, MaterialStockCorrectionLog, ProductStock, ProductStockCorrectionLog,
    PatternLog, CoreBoxLog
)
from .serializers import (
    SupplierSerializer, RawMaterialSerializer, CustomerSerializer, PatternMaterialSerializer, ProductSerializer, CoreBoxSerializer, PatternSerializer,
    MaterialStockSerializer, MaterialStockCorrectionLogSerializer, ProductStockSerializer, ProductStockCorrectionLogSerializer,
    PatternLogSerializer, CoreBoxLogSerializer
)
from rest_framework.response import Response

class DynamicResultSetPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 100

class SupplierViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = Supplier.objects.all().order_by('-id')
    serializer_class = SupplierSerializer

    def get_queryset(self):
        qs = Supplier.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                qs = qs.filter(
                    Q(supplier_id__icontains=search) |
                    Q(name__icontains=search) |
                    Q(code__icontains=search) |
                    Q(gst_number__icontains=search) |
                    Q(address_line1__icontains=search) |
                    Q(address_line2__icontains=search) |
                    Q(area__icontains=search) |
                    Q(pincode__icontains=search) |
                    Q(pan__icontains=search)
                )
        return qs

class RawMaterialViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = RawMaterial.objects.all().order_by('-id')
    serializer_class = RawMaterialSerializer

    def get_queryset(self):
        qs = RawMaterial.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                dept_filter = Q()
                STATIC_DEPARTMENTS = [
                    'Pattern', 'Core', 'Moulding', 'Melting', 'Pouring',
                    'Short Blast', 'Bed Grinding', 'Despatch - Fettling',
                    'Despatch - Hand Grinding', 'Despatch - Painting'
                ]
                for dept in STATIC_DEPARTMENTS:
                    if search.lower() in dept.lower():
                        dept_filter |= Q(departments__contains=dept)

                qs = qs.filter(
                    Q(code__icontains=search) |
                    Q(name__icontains=search) |
                    Q(unit__icontains=search) |
                    Q(category__icontains=search) |
                    dept_filter
                )
        return qs

    @action(detail=True, methods=['get'])
    def stock(self, request, pk=None):
        from django.db.models import Sum
        from purchases.models import PurchaseInwardItem, PurchaseRejectionItem, PurchaseReturnItem
        from rest_framework.response import Response
        
        raw_material = self.get_object()
        
        inward_qty = PurchaseInwardItem.objects.filter(
            raw_material=raw_material,
            purchase_inward__status='COMPLETED'
        ).aggregate(total=Sum('quantity'))['total'] or 0.0
        
        rejected_qty = PurchaseRejectionItem.objects.filter(
            raw_material=raw_material
        ).aggregate(total=Sum('rejected_quantity'))['total'] or 0.0
        
        returned_qty = PurchaseReturnItem.objects.filter(
            raw_material=raw_material
        ).aggregate(total=Sum('returned_quantity'))['total'] or 0.0
        
        current_stock = inward_qty - rejected_qty - returned_qty
        
        last_item = PurchaseInwardItem.objects.filter(
            raw_material=raw_material,
            purchase_inward__status='COMPLETED'
        ).order_by('-purchase_inward__inward_date', '-id').first()
        
        last_rate = last_item.rate if last_item else 0.0
        last_gst = last_item.gst if last_item else 18.0
        
        return Response({
            "raw_material_id": raw_material.id,
            "inward_quantity": inward_qty,
            "rejected_quantity": rejected_qty,
            "returned_quantity": returned_qty,
            "current_stock": max(current_stock, 0.0),
            "last_rate": last_rate,
            "last_gst": last_gst
        })

class CustomerViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer

    def get_queryset(self):
        qs = Customer.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                qs = qs.filter(
                    Q(customer_id__icontains=search) |
                    Q(name__icontains=search) |
                    Q(code__icontains=search) |
                    Q(gst_number__icontains=search) |
                    Q(address_line1__icontains=search) |
                    Q(address_line2__icontains=search) |
                    Q(area__icontains=search) |
                    Q(pincode__icontains=search) |
                    Q(pan__icontains=search)
                )
        return qs

class PatternMaterialViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = PatternMaterial.objects.all().order_by('-id')
    serializer_class = PatternMaterialSerializer

    def get_queryset(self):
        qs = PatternMaterial.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                qs = qs.filter(
                    Q(material_id__icontains=search) |
                    Q(name__icontains=search)
                )
        return qs

class ProductViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = Product.objects.all().order_by('-id')
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                qs = qs.filter(
                    Q(product_id__icontains=search) |
                    Q(name__icontains=search) |
                    Q(customer__name__icontains=search) |
                    Q(customer__code__icontains=search)
                )
        return qs

class CoreBoxViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = CoreBox.objects.all().order_by('-id')
    serializer_class = CoreBoxSerializer

    def get_queryset(self):
        qs = CoreBox.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                matching_product_ids = list(Product.objects.filter(
                    Q(name__icontains=search) | Q(product_id__icontains=search)
                ).values_list('id', flat=True))

                corebox_filter = Q(
                    Q(core_box_id__icontains=search) |
                    Q(name__icontains=search) |
                    Q(description__icontains=search) |
                    Q(core_box_type__icontains=search) |
                    Q(customer__name__icontains=search) |
                    Q(customer__code__icontains=search) |
                    Q(top_core_box__name__icontains=search) |
                    Q(top_core_box__material_id__icontains=search) |
                    Q(bottom_core_box__name__icontains=search) |
                    Q(bottom_core_box__material_id__icontains=search)
                )

                for p_id in matching_product_ids:
                    corebox_filter |= Q(products__contains=[{"product_id": str(p_id)}])

                qs = qs.filter(corebox_filter)
        return qs

    @action(detail=True, methods=['post'])
    def out_for_production(self, request, pk=None):
        core_box = self.get_object()
        
        latest_prod = core_box.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            raise ValidationError("Core box is already in production.")
        
        latest_insp = core_box.logs.filter(type_of_entry__in=['INSPECTION', 'INWARD']).order_by('-date', '-id').first()
        if latest_insp:
            from datetime import timedelta
            if timezone.now() - latest_insp.date < timedelta(days=30):
                raise ValidationError("Cannot send core box out for production; last inspection/inward date is less than 30 days ago.")
        
        description = request.data.get('description', 'Out for Production')
        log = CoreBoxLog.objects.create(
            core_box=core_box,
            type_of_entry='OUT_FOR_PRODUCTION',
            description=description,
            date=timezone.now()
        )
        return Response(CoreBoxLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def return_from_production(self, request, pk=None):
        core_box = self.get_object()
        
        latest_prod = core_box.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if not latest_prod or latest_prod.type_of_entry != 'OUT_FOR_PRODUCTION':
            raise ValidationError("Core box is not currently in production.")
        
        description = request.data.get('description', 'Return from Production')
        log = CoreBoxLog.objects.create(
            core_box=core_box,
            type_of_entry='RETURN_FROM_PRODUCTION',
            description=description,
            date=timezone.now()
        )
        return Response(CoreBoxLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def create_entry(self, request, pk=None):
        core_box = self.get_object()
        type_of_entry = request.data.get('type_of_entry')
        description = request.data.get('description')
        photo = request.data.get('photo')
        photos = request.data.get('photos', [])
        
        if not type_of_entry or type_of_entry not in ['INWARD', 'OUTWARD', 'INSPECTION']:
            raise ValidationError("A valid type_of_entry (INWARD, OUTWARD, or INSPECTION) is required.")
        
        if not description:
            raise ValidationError("description is required.")
            
        latest_prod = core_box.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            raise ValidationError("Cannot perform entry while core box is in production.")
            
        latest_io = core_box.logs.filter(type_of_entry__in=['INWARD', 'OUTWARD']).order_by('-date', '-id').first()
        
        if type_of_entry in ['INWARD', 'OUTWARD']:
            if latest_io:
                if latest_io.type_of_entry == type_of_entry:
                    raise ValidationError(f"Cannot add consecutive {type_of_entry.capitalize()} entries. The core box is already in that state.")
        elif type_of_entry == 'INSPECTION':
            if not latest_io or latest_io.type_of_entry == 'OUTWARD':
                raise ValidationError("Cannot add inspection entry when the core box is currently Outward or has not been brought Inward.")
                
        uploaded_photos = []
        if photo:
            uploaded_photos = [photo] if isinstance(photo, str) else photo
        elif photos:
            uploaded_photos = photos
            
        if type_of_entry == 'INWARD':
            if (not core_box.photos or len(core_box.photos) == 0) and uploaded_photos:
                core_box.photos = uploaded_photos
                core_box.save()

        log = CoreBoxLog.objects.create(
            core_box=core_box,
            type_of_entry=type_of_entry,
            description=description,
            photos=uploaded_photos,
            date=timezone.now()
        )
        return Response(CoreBoxLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        core_box = self.get_object()
        logs = core_box.logs.all().order_by('-date', '-id')
        
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = CoreBoxLogSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = CoreBoxLogSerializer(logs, many=True, context={'request': request})
        return Response(serializer.data)

class PatternViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = Pattern.objects.all().order_by('-id')
    serializer_class = PatternSerializer

    def get_queryset(self):
        qs = Pattern.objects.all().order_by('-id')
        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get('search', '').strip()
        if search:
            if search.lower() == 'active':
                qs = qs.filter(is_active=True)
            elif search.lower() == 'inactive':
                qs = qs.filter(is_active=False)
            else:
                matching_product_ids = list(Product.objects.filter(
                    Q(name__icontains=search) | Q(product_id__icontains=search)
                ).values_list('id', flat=True))
                
                matching_material_ids = list(PatternMaterial.objects.filter(
                    Q(name__icontains=search) | Q(material_id__icontains=search)
                ).values_list('id', flat=True))
                
                matching_corebox_ids = list(CoreBox.objects.filter(
                    Q(name__icontains=search) | Q(core_box_id__icontains=search)
                ).values_list('id', flat=True))
                
                pattern_filter = Q(
                    Q(pattern_id__icontains=search) |
                    Q(description__icontains=search) |
                    Q(pattern_type__icontains=search) |
                    Q(customer__name__icontains=search) |
                    Q(customer__code__icontains=search) |
                    Q(top_plate__name__icontains=search) |
                    Q(top_plate__material_id__icontains=search) |
                    Q(bottom_plate__name__icontains=search) |
                    Q(bottom_plate__material_id__icontains=search)
                )
                
                for p_id in matching_product_ids:
                    pattern_filter |= Q(products__contains=[{"product_id": str(p_id)}])
                    
                for m_id in matching_material_ids:
                    pattern_filter |= Q(products__contains=[{"material_type_id": str(m_id)}])
                    
                for cb_id in matching_corebox_ids:
                    pattern_filter |= Q(core_boxes__contains=cb_id)
                    
                qs = qs.filter(pattern_filter)
        return qs

    @action(detail=True, methods=['post'])
    def out_for_production(self, request, pk=None):
        pattern = self.get_object()
        
        # Check if already in production
        latest_prod = pattern.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            raise ValidationError("Pattern is already in production.")
        
        # Check validation: when inspection date is less than one month it should throw 400
        latest_insp = pattern.logs.filter(type_of_entry__in=['INSPECTION', 'INWARD']).order_by('-date', '-id').first()
        if latest_insp:
            from datetime import timedelta
            if timezone.now() - latest_insp.date < timedelta(days=30):
                raise ValidationError("Cannot send pattern out for production; last inspection/inward date is less than 30 days ago.")
        
        description = request.data.get('description', 'Out for Production')
        log = PatternLog.objects.create(
            pattern=pattern,
            type_of_entry='OUT_FOR_PRODUCTION',
            description=description,
            date=timezone.now()
        )
        return Response(PatternLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def return_from_production(self, request, pk=None):
        pattern = self.get_object()
        
        # Check if not in production
        latest_prod = pattern.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if not latest_prod or latest_prod.type_of_entry != 'OUT_FOR_PRODUCTION':
            raise ValidationError("Pattern is not currently in production.")
        
        description = request.data.get('description', 'Return from Production')
        log = PatternLog.objects.create(
            pattern=pattern,
            type_of_entry='RETURN_FROM_PRODUCTION',
            description=description,
            date=timezone.now()
        )
        return Response(PatternLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def create_entry(self, request, pk=None):
        pattern = self.get_object()
        type_of_entry = request.data.get('type_of_entry')
        description = request.data.get('description')
        photo = request.data.get('photo')
        photos = request.data.get('photos', [])
        
        if not type_of_entry or type_of_entry not in ['INWARD', 'OUTWARD', 'INSPECTION']:
            raise ValidationError("A valid type_of_entry (INWARD, OUTWARD, or INSPECTION) is required.")
        
        if not description:
            raise ValidationError("description is required.")
            
        # Check if pattern is in production
        latest_prod = pattern.logs.filter(type_of_entry__in=['OUT_FOR_PRODUCTION', 'RETURN_FROM_PRODUCTION']).order_by('-date', '-id').first()
        if latest_prod and latest_prod.type_of_entry == 'OUT_FOR_PRODUCTION':
            raise ValidationError("Cannot perform entry while pattern is in production.")
            
        # Check last entry between inward and outward
        latest_io = pattern.logs.filter(type_of_entry__in=['INWARD', 'OUTWARD']).order_by('-date', '-id').first()
        
        if type_of_entry in ['INWARD', 'OUTWARD']:
            if latest_io:
                if latest_io.type_of_entry == type_of_entry:
                    raise ValidationError(f"Cannot add consecutive {type_of_entry.capitalize()} entries. The pattern is already in that state.")
        elif type_of_entry == 'INSPECTION':
            if not latest_io or latest_io.type_of_entry == 'OUTWARD':
                raise ValidationError("Cannot add inspection entry when the pattern is currently Outward or has not been brought Inward.")
                
        # Resolve photo upload
        uploaded_photos = []
        if photo:
            uploaded_photos = [photo] if isinstance(photo, str) else photo
        elif photos:
            uploaded_photos = photos
            
        if type_of_entry == 'INWARD':
            if (not pattern.photos or len(pattern.photos) == 0) and uploaded_photos:
                pattern.photos = uploaded_photos
                pattern.save()

        log = PatternLog.objects.create(
            pattern=pattern,
            type_of_entry=type_of_entry,
            description=description,
            photos=uploaded_photos,
            date=timezone.now()
        )
        return Response(PatternLogSerializer(log, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        pattern = self.get_object()
        logs = pattern.logs.all().order_by('-date', '-id')
        
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = PatternLogSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = PatternLogSerializer(logs, many=True, context={'request': request})
        return Response(serializer.data)

class MaterialStockViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = MaterialStock.objects.all().order_by('-id')
    serializer_class = MaterialStockSerializer

    def get_queryset(self):
        # Sync stock once if empty to ingest pre-existing completions
        if not MaterialStock.objects.exists():
            self.run_initial_sync()

        qs = MaterialStock.objects.all().order_by('-id')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(raw_material__name__icontains=search) |
                Q(raw_material__code__icontains=search) |
                Q(batch_no__icontains=search)
            )
        return qs

    def run_initial_sync(self):
        from django.db.models import Sum
        from purchases.models import PurchaseInwardItem, PurchaseRejectionItem, PurchaseReturnItem
        
        items = PurchaseInwardItem.objects.filter(purchase_inward__status='COMPLETED')
        
        # Clear existing to guarantee fresh grouping calculation
        MaterialStock.objects.all().delete()
        
        grouped_items = {}
        for item in items:
            raw_material = item.raw_material
            batch_no = item.batch or ''
            expiry_date = item.expiry_date
            
            key = (raw_material.id, batch_no, expiry_date)
            if key not in grouped_items:
                grouped_items[key] = {
                    'raw_material': raw_material,
                    'batch_no': batch_no,
                    'expiry_date': expiry_date,
                    'quantity': 0.0
                }
            
            rejected = PurchaseRejectionItem.objects.filter(
                purchase_inward_item=item
            ).aggregate(total=Sum('rejected_quantity'))['total'] or 0.0

            returned = PurchaseReturnItem.objects.filter(
                purchase_inward_item=item
            ).aggregate(total=Sum('returned_quantity'))['total'] or 0.0
            
            net_qty = item.quantity - rejected - returned
            grouped_items[key]['quantity'] += net_qty
            
        for key, data in grouped_items.items():
            if data['quantity'] > 0:
                # Try to retrieve existing record in surya_castings
                stock = MaterialStock.objects.filter(
                    raw_material=data['raw_material'],
                    batch_no=data['batch_no'],
                    expiry_date=data['expiry_date']
                ).first()
                
                if stock:
                    stock.quantity = data['quantity']
                    stock.save()
                else:
                    MaterialStock.objects.create(
                        raw_material=data['raw_material'],
                        batch_no=data['batch_no'],
                        expiry_date=data['expiry_date'],
                        quantity=data['quantity']
                    )

    @action(detail=True, methods=['post'])
    def correct_stock(self, request, pk=None):
        stock = self.get_object()
        corrected_quantity = request.data.get('corrected_quantity')
        reason = request.data.get('reason')

        if corrected_quantity is None or reason is None:
            raise ValidationError("corrected_quantity and reason are required.")

        try:
            corrected_quantity = float(corrected_quantity)
        except ValueError:
            raise ValidationError("corrected_quantity must be a valid float.")

        original_quantity = stock.quantity
        
        # Log correction
        MaterialStockCorrectionLog.objects.create(
            raw_material=stock.raw_material,
            batch_no=stock.batch_no,
            expiry_date=stock.expiry_date,
            quantity=original_quantity,
            corrected_quantity=corrected_quantity,
            reason=reason
        )

        # Update stock
        stock.quantity = corrected_quantity
        stock.save()

        return Response(MaterialStockSerializer(stock, context={'request': request}).data)

class MaterialStockCorrectionLogViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = MaterialStockCorrectionLog.objects.all().order_by('-id')
    serializer_class = MaterialStockCorrectionLogSerializer

    def get_queryset(self):
        qs = MaterialStockCorrectionLog.objects.all().order_by('-id')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(raw_material__name__icontains=search) |
                Q(raw_material__code__icontains=search) |
                Q(batch_no__icontains=search) |
                Q(reason__icontains=search)
            )
        return qs

class ProductStockViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = ProductStock.objects.all().order_by('-id')
    serializer_class = ProductStockSerializer

    def get_queryset(self):
        qs = ProductStock.objects.all().order_by('-id')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(customer__name__icontains=search) |
                Q(customer__code__icontains=search) |
                Q(product__name__icontains=search) |
                Q(product__product_id__icontains=search) |
                Q(batch_no__icontains=search)
            )
        return qs

    @action(detail=True, methods=['post'])
    def correct_stock(self, request, pk=None):
        stock = self.get_object()
        corrected_quantity = request.data.get('corrected_quantity')
        reason = request.data.get('reason')

        if corrected_quantity is None or reason is None:
            raise ValidationError("corrected_quantity and reason are required.")

        try:
            corrected_quantity = float(corrected_quantity)
        except ValueError:
            raise ValidationError("corrected_quantity must be a valid float.")

        original_quantity = stock.quantity

        # Log correction
        ProductStockCorrectionLog.objects.create(
            customer=stock.customer,
            product=stock.product,
            batch_no=stock.batch_no,
            quantity=original_quantity,
            corrected_quantity=corrected_quantity,
            reason=reason
        )

        # Update stock
        stock.quantity = corrected_quantity
        stock.save()

        return Response(ProductStockSerializer(stock, context={'request': request}).data)

class ProductStockCorrectionLogViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = ProductStockCorrectionLog.objects.all().order_by('-id')
    serializer_class = ProductStockCorrectionLogSerializer

    def get_queryset(self):
        qs = ProductStockCorrectionLog.objects.all().order_by('-id')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(customer__name__icontains=search) |
                Q(customer__code__icontains=search) |
                Q(product__name__icontains=search) |
                Q(product__product_id__icontains=search) |
                Q(batch_no__icontains=search) |
                Q(reason__icontains=search)
            )
        return qs


class PatternLogViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = PatternLog.objects.all().order_by('-date', '-id')
    serializer_class = PatternLogSerializer

    def get_queryset(self):
        qs = PatternLog.objects.all().order_by('-date', '-id')
        pattern_id = self.request.query_params.get('pattern')
        if pattern_id:
            qs = qs.filter(pattern_id=pattern_id)
            
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(pattern__pattern_id__icontains=search) |
                Q(description__icontains=search) |
                Q(type_of_entry__icontains=search)
            )
        return qs

    def update(self, request, *args, **kwargs):
        if not request.user or not request.user.is_superuser:
            raise ValidationError("Only admin/superuser accounts can edit the log entries.")
        
        instance = self.get_object()
        date = request.data.get('date')
        description = request.data.get('description')
        
        if not description:
            raise ValidationError("Description is required.")
            
        if date:
            instance.date = date
        instance.description = description
        instance.save()
        return Response(self.get_serializer(instance).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user or not request.user.is_superuser:
            raise ValidationError("Only admin/superuser accounts can delete log entries.")
        return super().destroy(request, *args, **kwargs)


class CoreBoxLogViewSet(viewsets.ModelViewSet):
    pagination_class = DynamicResultSetPagination
    queryset = CoreBoxLog.objects.all().order_by('-date', '-id')
    serializer_class = CoreBoxLogSerializer

    def get_queryset(self):
        qs = CoreBoxLog.objects.all().order_by('-date', '-id')
        core_box_id = self.request.query_params.get('core_box')
        if core_box_id:
            qs = qs.filter(core_box_id=core_box_id)
            
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(core_box__core_box_id__icontains=search) |
                Q(description__icontains=search) |
                Q(type_of_entry__icontains=search)
            )
        return qs

    def update(self, request, *args, **kwargs):
        if not request.user or not request.user.is_superuser:
            raise ValidationError("Only admin/superuser accounts can edit the log entries.")
        
        instance = self.get_object()
        date = request.data.get('date')
        description = request.data.get('description')
        
        if not description:
            raise ValidationError("Description is required.")
            
        if date:
            instance.date = date
        instance.description = description
        instance.save()
        return Response(self.get_serializer(instance).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user or not request.user.is_superuser:
            raise ValidationError("Only admin/superuser accounts can delete log entries.")
        return super().destroy(request, *args, **kwargs)


