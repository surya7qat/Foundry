from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import (
    Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern,
    MaterialStock, MaterialStockCorrectionLog, ProductStock, ProductStockCorrectionLog
)
from .serializers import (
    SupplierSerializer, RawMaterialSerializer, CustomerSerializer, PatternMaterialSerializer, ProductSerializer, CoreBoxSerializer, PatternSerializer,
    MaterialStockSerializer, MaterialStockCorrectionLogSerializer, ProductStockSerializer, ProductStockCorrectionLogSerializer
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

