# Implementation Plan - Purchase Inward Draft & Completion Workflow

Introduce a workflow status (`Draft` vs `Completed`) for **Purchase Inward** receipts. Only Completed inwards should affect live inventory stock or be eligible for Rejections/Returns, and Completed inwards must be immutable.

## Proposed Changes

### Backend

#### [MODIFY] [models.py](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/backend/purchases/models.py)
* Add a `status` field to the `PurchaseInward` model:
  - `status = models.CharField(max_length=20, choices=[('DRAFT', 'Draft'), ('COMPLETED', 'Completed')], default='DRAFT')`

#### [MODIFY] [serializers.py](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/backend/purchases/serializers.py)
* Update `PurchaseInwardSerializer`:
  - In `update` validation, check if the record's current status is already `COMPLETED`. If yes, throw a `ValidationError` preventing modifications.
* Update `PurchaseRejectionSerializer` and `PurchaseReturnSerializer`:
  - In validation, check if the selected `purchase_inward.status == 'COMPLETED'`. If it is still in `DRAFT`, throw a `ValidationError` block.

#### [MODIFY] [views.py](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/backend/purchases/views.py)
* Update `PurchaseInwardViewSet` to handle a `completed_only=true` query parameter, filtering inwards to only those with `status='COMPLETED'`.

#### [MODIFY] [views.py](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/backend/inventory/views.py)
* Update `stock` calculation action on `RawMaterialViewSet` to only sum up inward quantities from `COMPLETED` purchase inwards:
  - `inward_qty = PurchaseInwardItem.objects.filter(raw_material=raw_material, purchase_inward__status='COMPLETED').aggregate(total=Sum('quantity'))['total'] or 0.0`

---

### Frontend

#### [MODIFY] [PurchaseInwardTab.tsx](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/purchases/PurchaseInwardTab.tsx)
* Add **Status Badge** column in the Listing Table (`Draft` in blue/gray, `Completed` in glowing green).
* In Listing Actions:
  - Show the **Edit** (pencil) button only if the Inward is in `DRAFT` status.
  - Show the **View** (eye) button for both.
* In Create/Edit views:
  - Add two submit buttons at the bottom:
    - **Save as Draft**: Submits with `status: 'DRAFT'`.
    - **Save & Complete**: Submits with `status: 'COMPLETED'`.
  - Wire up editing draft inwards. Selecting edit pre-fills the form with existing supplier details and line items, allowing changes and saving back to either status.

#### [MODIFY] [PurchaseRejectionTab.tsx](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/purchases/PurchaseRejectionTab.tsx) & [PurchaseReturnTab.tsx](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/purchases/PurchaseReturnTab.tsx)
* Update API fetch calls for parent inwards to append `?completed_only=true`, ensuring draft inwards cannot be selected for QC or supplier returns.

## Verification Plan
* Recreate migrations and seed.
* Verify compiler checks.
