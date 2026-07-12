from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from datetime import datetime
import calendar

from .models import (
    PurchaseInward, PurchaseInwardItem,
    PurchaseRejection, PurchaseRejectionItem,
    PurchaseReturn, PurchaseReturnItem
)
from .serializers import (
    PurchaseInwardSerializer,
    PurchaseRejectionSerializer,
    PurchaseReturnSerializer
)

class PurchaseInwardViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInward.objects.all().order_by('-id')
    serializer_class = PurchaseInwardSerializer
    
    def get_queryset(self):
        from django.db.models import Sum, F, Value
        from django.db.models.functions import Coalesce
        
        qs = super().get_queryset()
        
        qs = qs.annotate(
            total_value=Coalesce(
                Sum(F('items__quantity') * F('items__rate') * (1.0 + F('items__gst') / 100.0)),
                Value(0.0)
            )
        )
        
        from_month = self.request.query_params.get('from_month')
        if from_month:
            try:
                dt = datetime.strptime(from_month, '%Y-%m')
                qs = qs.filter(inward_date__gte=dt.date())
            except ValueError:
                pass
                
        to_month = self.request.query_params.get('to_month')
        if to_month:
            try:
                dt_to = datetime.strptime(to_month, '%Y-%m')
                last_day = calendar.monthrange(dt_to.year, dt_to.month)[1]
                end_date = dt_to.replace(day=last_day).date()
                qs = qs.filter(inward_date__lte=end_date)
            except ValueError:
                pass

        completed_only = self.request.query_params.get('completed_only')
        if completed_only == 'true':
            qs = qs.filter(status='COMPLETED')

        search = self.request.query_params.get('search', '').strip()
        if search:
            status_filter = Q()
            if search.lower() in 'draft':
                status_filter |= Q(status='DRAFT')
            if search.lower() in 'completed':
                status_filter |= Q(status='COMPLETED')
                
            numeric_filter = Q()
            try:
                val = float(search)
                numeric_filter |= Q(total_value__gte=val - 1.0) & Q(total_value__lte=val + 1.0)
            except ValueError:
                pass

            qs = qs.filter(
                Q(inward_number__icontains=search) |
                Q(supplier__name__icontains=search) |
                Q(supplier__code__icontains=search) |
                Q(bill_no__icontains=search) |
                Q(remarks__icontains=search) |
                Q(inward_date__icontains=search) |
                Q(bill_date__icontains=search) |
                status_filter |
                numeric_filter
            )
                
        return qs
    
    @action(detail=False, methods=['get'])
    def last_price(self, request):
        material_id = request.query_params.get('material_id')
        if not material_id:
            return Response({"error": "material_id is required"}, status=400)
            
        last_item = PurchaseInwardItem.objects.filter(
            raw_material_id=material_id,
            purchase_inward__status='COMPLETED'
        ).order_by('-purchase_inward__inward_date', '-id').first()
        
        if last_item:
            return Response({"rate": last_item.rate})
        else:
            return Response({"rate": 0})

    @action(detail=True, methods=['get'])
    def returnable_quantities(self, request, pk=None):
        from django.db.models import Sum
        inward = self.get_object()
        data = []
        for item in inward.items.all():
            already_rejected = PurchaseRejectionItem.objects.filter(
                purchase_inward_item=item
            ).aggregate(total=Sum('rejected_quantity'))['total'] or 0.0
            
            already_returned = PurchaseReturnItem.objects.filter(
                purchase_inward_item=item
            ).aggregate(total=Sum('returned_quantity'))['total'] or 0.0
            
            max_returnable = item.quantity - already_rejected - already_returned
            data.append({
                "purchase_inward_item": item.id,
                "raw_material": item.raw_material_id,
                "raw_material_code": item.raw_material.code,
                "raw_material_name": item.raw_material.name,
                "inward_quantity": item.quantity,
                "already_rejected": already_rejected,
                "already_returned": already_returned,
                "max_returnable": max_returnable if max_returnable > 0 else 0.0,
                "rate": item.rate,
                "gst": item.gst
            })
        return Response(data)


class PurchaseRejectionViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRejection.objects.all().order_by('-id')
    serializer_class = PurchaseRejectionSerializer

    def get_queryset(self):
        from django.db.models import Sum, F, Value
        from django.db.models.functions import Coalesce
        
        qs = super().get_queryset()
        
        qs = qs.annotate(
            total_value=Coalesce(
                Sum(F('items__rejected_quantity') * F('items__rate')),
                Value(0.0)
            )
        )
        
        from_month = self.request.query_params.get('from_month')
        if from_month:
            try:
                dt = datetime.strptime(from_month, '%Y-%m')
                qs = qs.filter(rejection_date__gte=dt.date())
            except ValueError:
                pass
                
        to_month = self.request.query_params.get('to_month')
        if to_month:
            try:
                dt_to = datetime.strptime(to_month, '%Y-%m')
                last_day = calendar.monthrange(dt_to.year, dt_to.month)[1]
                end_date = dt_to.replace(day=last_day).date()
                qs = qs.filter(rejection_date__lte=end_date)
            except ValueError:
                pass

        search = self.request.query_params.get('search', '').strip()
        if search:
            numeric_filter = Q()
            try:
                val = float(search)
                numeric_filter |= Q(total_value__gte=val - 1.0) & Q(total_value__lte=val + 1.0)
            except ValueError:
                pass

            qs = qs.filter(
                Q(rejection_number__icontains=search) |
                Q(purchase_inward__inward_number__icontains=search) |
                Q(purchase_inward__supplier__name__icontains=search) |
                Q(purchase_inward__supplier__code__icontains=search) |
                Q(remarks__icontains=search) |
                Q(rejection_date__icontains=search) |
                numeric_filter
            )
                
        return qs


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    queryset = PurchaseReturn.objects.all().order_by('-id')
    serializer_class = PurchaseReturnSerializer

    def get_queryset(self):
        from django.db.models import Sum, F, Value
        from django.db.models.functions import Coalesce
        
        qs = super().get_queryset()
        
        qs = qs.annotate(
            total_value=Coalesce(
                Sum(F('items__returned_quantity') * F('items__rate')),
                Value(0.0)
            )
        )
        
        from_month = self.request.query_params.get('from_month')
        if from_month:
            try:
                dt = datetime.strptime(from_month, '%Y-%m')
                qs = qs.filter(return_date__gte=dt.date())
            except ValueError:
                pass
                
        to_month = self.request.query_params.get('to_month')
        if to_month:
            try:
                dt_to = datetime.strptime(to_month, '%Y-%m')
                last_day = calendar.monthrange(dt_to.year, dt_to.month)[1]
                end_date = dt_to.replace(day=last_day).date()
                qs = qs.filter(return_date__lte=end_date)
            except ValueError:
                pass

        search = self.request.query_params.get('search', '').strip()
        if search:
            numeric_filter = Q()
            try:
                val = float(search)
                numeric_filter |= Q(total_value__gte=val - 1.0) & Q(total_value__lte=val + 1.0)
            except ValueError:
                pass

            qs = qs.filter(
                Q(return_number__icontains=search) |
                Q(purchase_inward__inward_number__icontains=search) |
                Q(purchase_inward__supplier__name__icontains=search) |
                Q(purchase_inward__supplier__code__icontains=search) |
                Q(remarks__icontains=search) |
                Q(return_date__icontains=search) |
                numeric_filter
            )
                
        return qs
