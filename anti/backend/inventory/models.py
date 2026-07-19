from django.db import models
from django.utils import timezone
from core.middleware import tenant_state

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=150, blank=True, default='System', editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=150, blank=True, default='System', editable=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        current_user = getattr(tenant_state, 'username', 'System')
        if not self.pk:
            if current_user:
                self.created_by = current_user
        if current_user:
            self.updated_by = current_user
        super().save(*args, **kwargs)

class Supplier(BaseModel):
    supplier_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Supplier ID already exists.'})
    name = models.CharField(max_length=100, unique=True, error_messages={'unique': 'A supplier with this Name already exists.'})
    code = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Supplier Code already exists.'})
    gst_number = models.CharField(max_length=15, unique=True, null=True, blank=True, error_messages={'unique': 'This GST Number is already registered.'})
    address_line1 = models.CharField(max_length=100, blank=True)
    address_line2 = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=50, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    pan = models.CharField(max_length=10, unique=True, null=True, blank=True, error_messages={'unique': 'This PAN is already registered.'})

    def __str__(self):
        return f"{self.code} - {self.name}"

class RawMaterial(BaseModel):
    UNIT_CHOICES = [
        ('Nos', 'Nos'),
        ('Kg', 'Kg'),
        ('g', 'g'),
        ('Pair', 'Pair'),
        ('Set', 'Set'),
        ('Box', 'Box'),
        ('Bag', 'Bag'),
        ('Can', 'Can'),
        ('Litre', 'Litre'),
        ('Millilitre', 'Millilitre'),
        ('Meter', 'Meter'),
        ('Centimeter', 'Centimeter'),
        ('Inch', 'Inch'),
        ('Packet', 'Packet'),
        ('Roll', 'Roll'),
        ('Bottle', 'Bottle'),
        ('Foot', 'Foot'),
        ('Square Feet', 'Square Feet'),
        ('Square Meter', 'Square Meter'),
        ('Cubic Meter', 'Cubic Meter'),
        ('Ton', 'Ton'),
        ('Sheet', 'Sheet'),
        ('Piece', 'Piece'),
    ]

    CATEGORY_CHOICES = [
        ('PRODUCTION', 'Production'),
        ('RAW_MATERIAL', 'Raw Material'),
    ]

    code = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Material Code already exists.'})
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=30, choices=UNIT_CHOICES, default='Kg')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='RAW_MATERIAL')
    departments = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class Customer(BaseModel):
    customer_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Customer ID already exists.'})
    name = models.CharField(max_length=100, unique=True, error_messages={'unique': 'A customer with this Name already exists.'})
    code = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Customer Code already exists.'})
    gst_number = models.CharField(max_length=15, unique=True, null=True, blank=True, error_messages={'unique': 'This GST Number is already registered.'})
    address_line1 = models.CharField(max_length=100, blank=True)
    address_line2 = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=50, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    pan = models.CharField(max_length=10, unique=True, null=True, blank=True, error_messages={'unique': 'This PAN is already registered.'})

    def __str__(self):
        return f"{self.code} - {self.name}"

class PatternMaterial(BaseModel):
    material_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Material ID already exists.'})
    name = models.CharField(max_length=100, unique=True, error_messages={'unique': 'A material with this Name already exists.'})

    def __str__(self):
        return f"{self.material_id} - {self.name}"

class Product(BaseModel):
    product_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Product ID already exists.'})
    name = models.CharField(max_length=100, unique=True, error_messages={'unique': 'A product with this Name already exists.'})
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='products')

    def __str__(self):
        return f"{self.product_id} - {self.name}"

class CoreBox(BaseModel):
    CORE_BOX_TYPE_CHOICES = [
        ('CO2', 'Co2'),
        ('OIL', 'Oil'),
        ('AMINE', 'Amine'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='coreboxes')
    core_box_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Core Box ID already exists.'})
    name = models.CharField(max_length=100, unique=True, error_messages={'unique': 'A Core Box with this Name already exists.'})
    top_core_box = models.ForeignKey(PatternMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name='coreboxes_top')
    bottom_core_box = models.ForeignKey(PatternMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name='coreboxes_bottom')
    products = models.JSONField(default=list, blank=True)  # list of {product_id: int, cavity: int}
    core_box_type = models.CharField(max_length=20, choices=CORE_BOX_TYPE_CHOICES, default='CO2')
    photos = models.JSONField(default=list, blank=True)  # list of base64 strings
    description = models.CharField(max_length=250, blank=True)

    def __str__(self):
        return self.name

class Pattern(BaseModel):
    PATTERN_TYPE_CHOICES = [
        ('CO2', 'Co2'),
        ('BLACK_SAND', 'Black Sand'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='patterns')
    pattern_id = models.CharField(max_length=15, unique=True, error_messages={'unique': 'This Pattern ID already exists.'})
    top_plate = models.ForeignKey(PatternMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name='patterns_top')
    bottom_plate = models.ForeignKey(PatternMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name='patterns_bottom')
    products = models.JSONField(default=list, blank=True)  # list of {product_id: int, cavity: int, material_type_id: int}
    core_boxes = models.JSONField(default=list, blank=True)  # list of CoreBox IDs
    pattern_type = models.CharField(max_length=20, choices=PATTERN_TYPE_CHOICES, default='CO2')
    photos = models.JSONField(default=list, blank=True)  # list of base64 strings
    description = models.CharField(max_length=250, blank=True)

    def __str__(self):
        return f"{self.pattern_id} - {self.customer.name}"

class MaterialStock(BaseModel):
    raw_material = models.ForeignKey(RawMaterial, on_delete=models.RESTRICT, related_name='material_stocks')
    batch_no = models.CharField(max_length=50)
    expiry_date = models.DateField(null=True, blank=True)
    quantity = models.FloatField()

    class Meta:
        unique_together = ('raw_material', 'batch_no', 'expiry_date')

    def __str__(self):
        return f"{self.raw_material.name} - Batch: {self.batch_no} ({self.quantity} {self.raw_material.unit})"

class MaterialStockCorrectionLog(BaseModel):
    raw_material = models.ForeignKey(RawMaterial, on_delete=models.RESTRICT, related_name='material_correction_logs')
    batch_no = models.CharField(max_length=50)
    expiry_date = models.DateField(null=True, blank=True)
    quantity = models.FloatField()  # Original quantity
    corrected_quantity = models.FloatField()  # New corrected quantity
    reason = models.TextField()

    def __str__(self):
        return f"Correction for {self.raw_material.name} Batch {self.batch_no} from {self.quantity} to {self.corrected_quantity}"

class ProductStock(BaseModel):
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='product_stocks')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='product_stocks')
    batch_no = models.CharField(max_length=50)
    quantity = models.FloatField()

    class Meta:
        unique_together = ('customer', 'product', 'batch_no')

    def __str__(self):
        return f"{self.product.name} - Batch: {self.batch_no} ({self.quantity} Nos)"

class ProductStockCorrectionLog(BaseModel):
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='product_correction_logs')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='product_correction_logs')
    batch_no = models.CharField(max_length=50)
    quantity = models.FloatField()  # Original quantity
    corrected_quantity = models.FloatField()  # New corrected quantity
    reason = models.TextField()

    def __str__(self):
        return f"Correction for {self.product.name} Batch {self.batch_no} from {self.quantity} to {self.corrected_quantity}"


class PatternLog(BaseModel):
    ENTRY_TYPE_CHOICES = [
        ('INWARD', 'Inward'),
        ('OUTWARD', 'Outward'),
        ('INSPECTION', 'Inspection'),
        ('OUT_FOR_PRODUCTION', 'Out for Production'),
        ('RETURN_FROM_PRODUCTION', 'Return from Production'),
    ]

    pattern = models.ForeignKey(Pattern, on_delete=models.CASCADE, related_name='logs')
    date = models.DateTimeField(default=timezone.now)
    type_of_entry = models.CharField(max_length=50, choices=ENTRY_TYPE_CHOICES)
    description = models.TextField()
    photos = models.JSONField(default=list, blank=True)  # list of base64 strings

    def __str__(self):
        return f"PatternLog: {self.pattern.pattern_id} - {self.type_of_entry} on {self.date}"

class CoreBoxLog(BaseModel):
    ENTRY_TYPE_CHOICES = [
        ('INWARD', 'Inward'),
        ('OUTWARD', 'Outward'),
        ('INSPECTION', 'Inspection'),
        ('OUT_FOR_PRODUCTION', 'Out for Production'),
        ('RETURN_FROM_PRODUCTION', 'Return from Production'),
    ]

    core_box = models.ForeignKey(CoreBox, on_delete=models.CASCADE, related_name='logs')
    date = models.DateTimeField(default=timezone.now)
    type_of_entry = models.CharField(max_length=50, choices=ENTRY_TYPE_CHOICES)
    description = models.TextField()
    photos = models.JSONField(default=list, blank=True)  # list of base64 strings

    def __str__(self):
        return f"CoreBoxLog: {self.core_box.core_box_id} - {self.type_of_entry} on {self.date}"





