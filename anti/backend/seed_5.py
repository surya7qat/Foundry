import os
import django
import datetime

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from inventory.models import Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern
from purchases.models import PurchaseInward, PurchaseInwardItem, PurchaseRejection, PurchaseRejectionItem, PurchaseReturn, PurchaseReturnItem

def clean_and_seed_5():
    from core.middleware import tenant_state
    tenant_state.db = 'surya_castings'
    db = 'surya_castings'
    print(f"Cleaning existing transaction and master records in database [{db}]...")
    
    # Delete transactions first
    PurchaseReturnItem.objects.using(db).all().delete()
    PurchaseReturn.objects.using(db).all().delete()
    PurchaseRejectionItem.objects.using(db).all().delete()
    PurchaseRejection.objects.using(db).all().delete()
    PurchaseInwardItem.objects.using(db).all().delete()
    PurchaseInward.objects.using(db).all().delete()
    
    # Delete masters
    Pattern.objects.using(db).all().delete()
    CoreBox.objects.using(db).all().delete()
    Product.objects.using(db).all().delete()
    PatternMaterial.objects.using(db).all().delete()
    Customer.objects.using(db).all().delete()
    RawMaterial.objects.using(db).all().delete()
    Supplier.objects.using(db).all().delete()
    
    print("Seeding exactly 5 dummy records for each master...")

    # 1. Suppliers
    suppliers = []
    for i in range(1, 6):
        suppliers.append(Supplier(
            supplier_id=f"SUP-{i:03d}",
            name=f"Supplier Name {i:02d}",
            code=f"SCODE-{i:03d}",
            is_active=True
        ))
    Supplier.objects.using(db).bulk_create(suppliers)
    print("Seeded 5 Suppliers!")

    # 2. Customers
    customers = []
    for i in range(1, 6):
        customers.append(Customer(
            customer_id=f"CUST-{i:03d}",
            name=f"Customer Name {i:02d}",
            code=f"CCODE-{i:03d}",
            is_active=True
        ))
    Customer.objects.using(db).bulk_create(customers)
    print("Seeded 5 Customers!")

    # 3. Pattern Materials
    pattern_materials = []
    materials_pool = ["Aluminum", "Wood", "Cast Iron", "Steel", "Plastic"]
    for i in range(1, 6):
        mat_name = f"{materials_pool[(i-1) % len(materials_pool)]} Type {i:02d}"
        pattern_materials.append(PatternMaterial(
            material_id=f"MAT-{i:03d}",
            name=mat_name,
            is_active=True
        ))
    PatternMaterial.objects.using(db).bulk_create(pattern_materials)
    print("Seeded 5 Pattern Materials!")

    # Load inserted objects to reference as foreign keys
    db_suppliers = list(Supplier.objects.using(db).all())
    db_customers = list(Customer.objects.using(db).all())
    db_materials = list(PatternMaterial.objects.using(db).all())

    # 4. Products
    products = []
    for i in range(1, 6):
        cust = db_customers[(i-1) % len(db_customers)]
        products.append(Product(
            product_id=f"PROD-{i:03d}",
            name=f"Product Item {i:02d}",
            customer=cust,
            is_active=True
        ))
    Product.objects.using(db).bulk_create(products)
    print("Seeded 5 Products!")

    # 5. Raw Materials
    raw_materials = []
    units_pool = ["Nos", "Kg", "Litre", "Ton", "Piece"]
    depts_pool = ["Pattern", "Core", "Moulding", "Melting", "Pouring"]
    for i in range(1, 6):
        raw_materials.append(RawMaterial(
            code=f"RAW-{i:03d}",
            name=f"Raw Material {i:02d}",
            unit=units_pool[(i-1) % len(units_pool)],
            category="RAW_MATERIAL" if i % 2 == 0 else "PRODUCTION",
            departments=[depts_pool[(i-1) % len(depts_pool)]],
            is_active=True
        ))
    RawMaterial.objects.using(db).bulk_create(raw_materials)
    print("Seeded 5 Raw Materials!")

    db_products = list(Product.objects.using(db).all())
    db_raw_materials = list(RawMaterial.objects.using(db).all())

    # 6. Core Boxes
    core_boxes = []
    types_pool = ["CO2", "OIL", "AMINE"]
    for i in range(1, 6):
        cust = db_customers[(i-1) % len(db_customers)]
        top_mat = db_materials[(i-1) % len(db_materials)]
        bot_mat = db_materials[(i) % len(db_materials)]
        prod = db_products[(i-1) % len(db_products)]
        
        core_boxes.append(CoreBox(
            customer=cust,
            core_box_id=f"CB-{i:03d}",
            name=f"Core Box {i:02d}",
            top_core_box=top_mat,
            bottom_core_box=bot_mat,
            core_box_type=types_pool[(i-1) % len(types_pool)],
            products=[{"product_id": str(prod.id), "cavity": 2}],
            description=f"Automated core box description {i:02d}",
            is_active=True
        ))
    CoreBox.objects.using(db).bulk_create(core_boxes)
    print("Seeded 5 Core Boxes!")

    db_core_boxes = list(CoreBox.objects.using(db).all())

    # 7. Patterns
    patterns = []
    pattern_types_pool = ["CO2", "BLACK_SAND"]
    for i in range(1, 6):
        cust = db_customers[(i-1) % len(db_customers)]
        top_mat = db_materials[(i-1) % len(db_materials)]
        bot_mat = db_materials[(i) % len(db_materials)]
        prod = db_products[(i-1) % len(db_products)]
        cb = db_core_boxes[(i-1) % len(db_core_boxes)]
        
        patterns.append(Pattern(
            customer=cust,
            pattern_id=f"PAT-{i:03d}",
            top_plate=top_mat,
            bottom_plate=bot_mat,
            core_boxes=[cb.id],
            products=[{"product_id": str(prod.id), "cavity": 4, "material_type_id": str(top_mat.id)}],
            pattern_type=pattern_types_pool[(i-1) % len(pattern_types_pool)],
            description=f"Automated pattern description {i:02d}",
            is_active=True
        ))
    Pattern.objects.using(db).bulk_create(patterns)
    print("Seeded 5 Patterns!")

    print("\nSeeding exactly 5 dummy records for Transactions...")

    # 8. Purchase Inwards (3 COMPLETED, 2 DRAFT)
    inwards = []
    inward_statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "DRAFT", "DRAFT"]
    for i in range(1, 6):
        supp = db_suppliers[(i-1) % len(db_suppliers)]
        inwards.append(PurchaseInward(
            inward_number=f"INW-{i:03d}",
            supplier=supp,
            inward_date=datetime.date(2026, 7, i),
            bill_no=f"BILL-{i:03d}",
            bill_date=datetime.date(2026, 7, i),
            remarks=f"Inward receipt {i:02d}",
            status=inward_statuses[i-1]
        ))
    
    # We must save inwards one-by-one to generate PKs since we need them for InwardItems
    db_inwards = []
    for inw in inwards:
        inw.save(using=db)
        db_inwards.append(inw)
    
    print("Seeded 5 Purchase Inwards!")

    # Inward Items
    inward_items = []
    for i, inw in enumerate(db_inwards):
        mat = db_raw_materials[i % len(db_raw_materials)]
        qty = 100.0 + (i * 50)
        rate = 15.0 + (i * 5)
        gst = 18.0
        cgst = (qty * rate) * (gst / 200.0)
        sgst = (qty * rate) * (gst / 200.0)
        
        inward_items.append(PurchaseInwardItem(
            purchase_inward=inw,
            raw_material=mat,
            quantity=qty,
            rate=rate,
            gst=gst,
            cgst=cgst,
            sgst=sgst,
            batch=f"BATCH-{i+1:02d}",
            expiry_date=datetime.date(2027, 7, i+1)
        ))
    
    db_inward_items = []
    for item in inward_items:
        item.save(using=db)
        db_inward_items.append(item)
    print("Seeded Purchase Inward Items!")

    # 9. Purchase Rejections (5 Rejections, referencing COMPLETED inwards)
    # Filter completed inwards
    completed_inwards = [inw for inw in db_inwards if inw.status == "COMPLETED"]
    
    rejections = []
    for i in range(1, 6):
        # Cycle through completed inwards
        inw = completed_inwards[(i-1) % len(completed_inwards)]
        rejections.append(PurchaseRejection(
            rejection_number=f"REJ-{i:03d}",
            rejection_date=datetime.date(2026, 7, i + 5),
            purchase_inward=inw,
            remarks=f"QC Rejection {i:02d}"
        ))
        
    db_rejections = []
    for rej in rejections:
        rej.save(using=db)
        db_rejections.append(rej)
    print("Seeded 5 Purchase Rejections!")

    # Rejection Items
    rejection_items = []
    for i, rej in enumerate(db_rejections):
        inw_item = db_inward_items[i % len(completed_inwards)]
        qty = 5.0 + i
        rate = inw_item.rate
        gst = inw_item.gst
        cgst = (qty * rate) * (gst / 200.0)
        sgst = (qty * rate) * (gst / 200.0)
        
        rejection_items.append(PurchaseRejectionItem(
            purchase_rejection=rej,
            purchase_inward_item=inw_item,
            raw_material=inw_item.raw_material,
            rejected_quantity=qty,
            rate=rate,
            gst=gst,
            cgst=cgst,
            sgst=sgst
        ))
    for item in rejection_items:
        item.save(using=db)
    print("Seeded Purchase Rejection Items!")

    # 10. Purchase Returns (5 Returns, referencing COMPLETED inwards)
    returns = []
    for i in range(1, 6):
        inw = completed_inwards[(i-1) % len(completed_inwards)]
        returns.append(PurchaseReturn(
            return_number=f"RET-{i:03d}",
            return_date=datetime.date(2026, 7, i + 10),
            purchase_inward=inw,
            remarks=f"Supplier Return {i:02d}"
        ))
        
    db_returns = []
    for ret in returns:
        ret.save(using=db)
        db_returns.append(ret)
    print("Seeded 5 Purchase Returns!")

    # Return Items
    return_items = []
    for i, ret in enumerate(db_returns):
        inw_item = db_inward_items[i % len(completed_inwards)]
        qty = 2.0 + i
        rate = inw_item.rate
        gst = inw_item.gst
        cgst = (qty * rate) * (gst / 200.0)
        sgst = (qty * rate) * (gst / 200.0)
        
        return_items.append(PurchaseReturnItem(
            purchase_return=ret,
            purchase_inward_item=inw_item,
            raw_material=inw_item.raw_material,
            returned_quantity=qty,
            rate=rate,
            gst=gst,
            cgst=cgst,
            sgst=sgst
        ))
    for item in return_items:
        item.save(using=db)
    print("Seeded Purchase Return Items!")

    # Seed Product Stock
    from inventory.models import ProductStock
    product_stocks = []
    for idx, prod in enumerate(db_products):
        product_stocks.append(ProductStock(
            customer=prod.customer,
            product=prod,
            batch_no=f"B-PROD-{idx+1:03d}",
            quantity=100.0 * (idx + 1)
        ))
    for p_stock in product_stocks:
        p_stock.save(using=db)
    print("Seeded Product Stocks!")

    # Central database roles and users seeding
    from accounts.models import Client, Role, CustomUser
    client = Client.objects.filter(name="Surya Castings").first()
    if client:
        print("Cleaning and seeding 5 Users and Roles in central database...")
        # Clean existing seeded roles/users
        CustomUser.objects.filter(username__in=[f"surya{i}" for i in range(1, 6)]).delete()
        Role.objects.filter(name__in=[f"Seeded Role {i}" for i in range(1, 6)], client=client).delete()

        # 5 Roles
        seeded_roles = []
        for i in range(1, 6):
            role = Role.objects.create(
                name=f"Seeded Role {i}",
                client=client,
                can_access_dashboard=True,
                can_access_supplier_master=(i % 2 == 1),
                can_access_raw_material_master=(i % 2 == 0),
                can_access_customer_master=(i % 3 == 0),
                can_access_pattern_material_master=(i % 3 == 1),
                can_access_product_master=(i % 3 == 2),
                can_access_core_box_master=True,
                can_access_pattern_master=False,
                can_access_purchase_inward=True,
                can_access_purchase_rejection=False,
                can_access_purchase_return=True,
                can_access_material_stock=True,
                can_access_material_stock_log=True,
                can_access_product_stock=True,
                can_access_product_stock_log=True
            )
            seeded_roles.append(role)
        print("Seeded 5 Roles!")

        # 5 Users
        for i in range(1, 6):
            user = CustomUser.objects.create(
                username=f"surya{i}",
                email=f"surya{i}@castings.com",
                client=client,
                role=seeded_roles[i-1],
                is_active=True,
                is_superuser=False,
                show_customer_to_all_departments=(i % 2 == 1),
                show_supplier_to_all_departments=(i % 2 == 0)
            )
            user.set_password("Surya@123")
            user.save()
        print("Seeded 5 Users (surya1 to surya5) with password Surya@123!")

    print("\nSeeding completed successfully! Exactly 5 data records added to each master and transaction type.")

if __name__ == '__main__':
    clean_and_seed_5()
