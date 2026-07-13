import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from inventory.models import Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern

def clean_and_seed_50():
    from core.middleware import tenant_state
    tenant_state.db = 'surya_castings'
    db = 'surya_castings'
    print(f"Cleaning existing records in database [{db}]...")
    
    # Delete dependent tables first to prevent ForeignKey violations
    from inventory.models import ProductStock, ProductStockCorrectionLog, MaterialStock, MaterialStockCorrectionLog
    from purchases.models import PurchaseReturnItem, PurchaseReturn, PurchaseRejectionItem, PurchaseRejection, PurchaseInwardItem, PurchaseInward
    
    PurchaseReturnItem.objects.using(db).all().delete()
    PurchaseReturn.objects.using(db).all().delete()
    PurchaseRejectionItem.objects.using(db).all().delete()
    PurchaseRejection.objects.using(db).all().delete()
    PurchaseInwardItem.objects.using(db).all().delete()
    PurchaseInward.objects.using(db).all().delete()
    
    ProductStockCorrectionLog.objects.using(db).all().delete()
    ProductStock.objects.using(db).all().delete()
    MaterialStockCorrectionLog.objects.using(db).all().delete()
    MaterialStock.objects.using(db).all().delete()
    Pattern.objects.using(db).all().delete()
    CoreBox.objects.using(db).all().delete()
    Product.objects.using(db).all().delete()
    PatternMaterial.objects.using(db).all().delete()
    Customer.objects.using(db).all().delete()
    RawMaterial.objects.using(db).all().delete()
    Supplier.objects.using(db).all().delete()
    
    print("Seeding exactly 50 dummy records for each master...")

    # 1. Suppliers
    suppliers = []
    for i in range(1, 51):
        suppliers.append(Supplier(
            supplier_id=f"SUP-{i:03d}",
            name=f"Supplier Name {i:02d}",
            code=f"SCODE-{i:03d}",
            is_active=True
        ))
    Supplier.objects.using(db).bulk_create(suppliers)
    print("Seeded 50 Suppliers!")

    # 2. Customers
    customers = []
    for i in range(1, 51):
        customers.append(Customer(
            customer_id=f"CUST-{i:03d}",
            name=f"Customer Name {i:02d}",
            code=f"CCODE-{i:03d}",
            is_active=True
        ))
    Customer.objects.using(db).bulk_create(customers)
    print("Seeded 50 Customers!")

    # 3. Pattern Materials
    pattern_materials = []
    materials_pool = ["Aluminum", "Wood", "Cast Iron", "Steel", "Plastic"]
    for i in range(1, 51):
        mat_name = f"{materials_pool[(i-1) % len(materials_pool)]} Type {i:02d}"
        pattern_materials.append(PatternMaterial(
            material_id=f"MAT-{i:03d}",
            name=mat_name,
            is_active=True
        ))
    PatternMaterial.objects.using(db).bulk_create(pattern_materials)
    print("Seeded 50 Pattern Materials!")

    # 4. Products
    db_customers = list(Customer.objects.using(db).all())
    products = []
    for i in range(1, 51):
        cust = db_customers[(i-1) % len(db_customers)]
        products.append(Product(
            product_id=f"PROD-{i:03d}",
            name=f"Product Item {i:02d}",
            customer=cust,
            is_active=True
        ))
    Product.objects.using(db).bulk_create(products)
    print("Seeded 50 Products!")

    # 5. Raw Materials
    raw_materials = []
    units_pool = ["Nos", "Kg", "Litre", "Ton", "Piece"]
    depts_pool = ["Pattern", "Core", "Moulding", "Melting", "Pouring"]
    for i in range(1, 51):
        raw_materials.append(RawMaterial(
            code=f"RAW-{i:03d}",
            name=f"Raw Material {i:02d}",
            unit=units_pool[(i-1) % len(units_pool)],
            category="RAW_MATERIAL" if i % 2 == 0 else "PRODUCTION",
            departments=[depts_pool[(i-1) % len(depts_pool)]],
            is_active=True
        ))
    RawMaterial.objects.using(db).bulk_create(raw_materials)
    print("Seeded 50 Raw Materials!")

    # Load inserted objects to reference as foreign keys
    db_customers = list(Customer.objects.using(db).all())
    db_materials = list(PatternMaterial.objects.using(db).all())
    db_products = list(Product.objects.using(db).all())

    # 6. Core Boxes
    core_boxes = []
    types_pool = ["CO2", "OIL", "AMINE"]
    for i in range(1, 51):
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
    print("Seeded 50 Core Boxes!")

    # Load inserted core boxes
    db_core_boxes = list(CoreBox.objects.using(db).all())

    # 7. Patterns
    patterns = []
    pattern_types_pool = ["CO2", "BLACK_SAND"]
    for i in range(1, 51):
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
    print("Seeded 50 Patterns!")

    # 8. Product Stocks
    product_stocks = []
    for i in range(1, 51):
        prod = db_products[(i-1) % len(db_products)]
        product_stocks.append(ProductStock(
            customer=prod.customer,
            product=prod,
            batch_no=f"B-PROD-{i:03d}",
            quantity=100.0 * i
        ))
    ProductStock.objects.using(db).bulk_create(product_stocks)
    print("Seeded 50 Product Stocks!")

    print("\nSeeding completed successfully! Exactly 50 data records added to each master.")

if __name__ == '__main__':
    clean_and_seed_50()
