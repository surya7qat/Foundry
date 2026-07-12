from django.db import models
from inventory.models import BaseModel, Supplier, RawMaterial

class PurchaseInward(BaseModel):
    inward_number = models.CharField(max_length=20, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.RESTRICT, related_name='purchase_inwards')
    inward_date = models.DateField()
    bill_no = models.CharField(max_length=20, unique=True)
    bill_date = models.DateField()
    remarks = models.CharField(max_length=250, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('DRAFT', 'Draft'), ('COMPLETED', 'Completed')],
        default='DRAFT'
    )

    def __str__(self):
        return f"{self.inward_number} - {self.supplier.name}"

class PurchaseInwardItem(models.Model):
    purchase_inward = models.ForeignKey(PurchaseInward, on_delete=models.CASCADE, related_name='items')
    raw_material = models.ForeignKey(RawMaterial, on_delete=models.RESTRICT, related_name='inward_items')
    quantity = models.FloatField()
    rate = models.FloatField()
    gst = models.FloatField(default=18.0)
    cgst = models.FloatField(default=0.0)
    sgst = models.FloatField(default=0.0)
    batch = models.CharField(max_length=50, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    @property
    def amount(self):
        return self.quantity * self.rate

    @property
    def sub_total(self):
        return (self.quantity * self.rate) + self.cgst + self.sgst

    def __str__(self):
        return f"{self.purchase_inward.inward_number} - {self.raw_material.code}"

class PurchaseRejection(BaseModel):
    rejection_number = models.CharField(max_length=20, unique=True)
    rejection_date = models.DateField()
    purchase_inward = models.ForeignKey(PurchaseInward, on_delete=models.RESTRICT, related_name='rejections')
    remarks = models.CharField(max_length=250, blank=True)

    def __str__(self):
        return f"{self.rejection_number} - Inward {self.purchase_inward.inward_number}"

class PurchaseRejectionItem(models.Model):
    purchase_rejection = models.ForeignKey(PurchaseRejection, on_delete=models.CASCADE, related_name='items')
    purchase_inward_item = models.ForeignKey(PurchaseInwardItem, on_delete=models.RESTRICT, related_name='rejection_items', null=True, blank=True)
    raw_material = models.ForeignKey(RawMaterial, on_delete=models.RESTRICT, related_name='rejection_items')
    rejected_quantity = models.FloatField()
    rate = models.FloatField()
    gst = models.FloatField(default=18.0)
    cgst = models.FloatField(default=0.0)
    sgst = models.FloatField(default=0.0)

    @property
    def amount(self):
        return (self.rejected_quantity * self.rate) + self.cgst + self.sgst

    def __str__(self):
        return f"{self.purchase_rejection.rejection_number} - {self.raw_material.code}"

class PurchaseReturn(BaseModel):
    return_number = models.CharField(max_length=20, unique=True)
    return_date = models.DateField()
    purchase_inward = models.ForeignKey(PurchaseInward, on_delete=models.RESTRICT, related_name='returns')
    remarks = models.CharField(max_length=250, blank=True)

    def __str__(self):
        return f"{self.return_number} - Inward {self.purchase_inward.inward_number}"

class PurchaseReturnItem(models.Model):
    purchase_return = models.ForeignKey(PurchaseReturn, on_delete=models.CASCADE, related_name='items')
    purchase_inward_item = models.ForeignKey(PurchaseInwardItem, on_delete=models.RESTRICT, related_name='return_items', null=True, blank=True)
    raw_material = models.ForeignKey(RawMaterial, on_delete=models.RESTRICT, related_name='return_items')
    returned_quantity = models.FloatField()
    rate = models.FloatField()
    gst = models.FloatField(default=18.0)
    cgst = models.FloatField(default=0.0)
    sgst = models.FloatField(default=0.0)

    @property
    def amount(self):
        return (self.returned_quantity * self.rate) + self.cgst + self.sgst

    def __str__(self):
        return f"{self.purchase_return.return_number} - {self.raw_material.code}"
