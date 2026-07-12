import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from inventory.models import Supplier, RawMaterial

def seed_surya_castings():
    # print("Seeding dummy data into [surya_castings] database...")

    # # Dummy Suppliers
    # suppliers = [
    #     Supplier(name="Tata Steel Ltd", contact_person="Ratan Tata", contact_number="9876543210", email="orders@tatasteel.com", address="Jamshedpur, Jharkhand", gst_number="20AAACT0261H1Z0"),
    #     Supplier(name="JSW Steel", contact_person="Sajjan Jindal", contact_number="9988776655", email="supply@jsw.in", address="Bellary, Karnataka", gst_number="29AAACJ4042L1Z9"),
    #     Supplier(name="Vedanta Resources", contact_person="Anil Agarwal", contact_number="9123456780", email="info@vedanta.co.in", address="Jharsuguda, Odisha", gst_number="21AAACV5566A1ZA"),
    #     Supplier(name="Hindalco Ind", contact_person="Kumar Mangalam", contact_number="9876123450", email="sales@hindalco.com", address="Renukoot, UP", gst_number="09AAACH1234M1ZB"),
    #     Supplier(name="SAIL India", contact_person="Amarendu Prakash", contact_number="9988112233", email="contact@sail.in", address="Bokaro, Jharkhand", gst_number="20AAACS8877K1ZC"),
    # ]

    try:
        # Check existing to prevent duplicates
        # if not Supplier.objects.using('surya_castings').exists():
        #     Supplier.objects.using('surya_castings').bulk_create(suppliers)
        #     print("✅ 5 Suppliers added successfully to surya_castings!")
        # else:
        #     print("⚠️ Suppliers already exist in surya_castings.")

        materials = [
            # RawMaterial(code="STL-10", name="High Carbon Steel", grade="EN-31", unit="kg", minimum_stock=500.00),
            # RawMaterial(code="ALU-202", name="Aluminum Alloy", grade="LM-6", unit="kg", minimum_stock=300.50),
            # RawMaterial(code="CI-303", name="Cast Iron Ingot", grade="FG-260", unit="ton", minimum_stock=50.00),
            # RawMaterial(code="BRZ-404", name="Bronze Scrap", grade="C90300", unit="kg", minimum_stock=150.00),
            # RawMaterial(code="COP-505", name="Copper Wire", grade="Pure", unit="kg", minimum_stock=200.00),
            RawMaterial(code="IRN-606", name="Pig Iron", grade="Foundry Grade", unit="ton", minimum_stock=20.00),
            RawMaterial(code="NIC-707", name="Nickel Alloy", grade="Inconel 718", unit="kg", minimum_stock=50.00),
            RawMaterial(code="ZIN-808", name="Zinc Ingots", grade="Zamak 3", unit="kg", minimum_stock=400.00),
            RawMaterial(code="CHR-909", name="Chromium Scrap", grade="High Carbon", unit="kg", minimum_stock=100.00),
            RawMaterial(code="MNG-110", name="Manganese Ore", grade="Grade A", unit="ton", minimum_stock=15.00),
            RawMaterial(code="SIL-211", name="Ferro Silicon", grade="75% Si", unit="kg", minimum_stock=600.00),
            RawMaterial(code="TGC-312", name="Tungsten Carbide", grade="WC-Co", unit="kg", minimum_stock=5.00),
            RawMaterial(code="MOL-413", name="Molybdenum", grade="Mo-99", unit="kg", minimum_stock=10.00),
            RawMaterial(code="VAN-514", name="Ferro Vanadium", grade="80% V", unit="kg", minimum_stock=25.00),
            RawMaterial(code="TIT-615", name="Titanium Sponge", grade="Grade 2", unit="kg", minimum_stock=40.00),
            RawMaterial(code="MAG-716", name="Magnesium Alloy", grade="AZ91D", unit="kg", minimum_stock=120.00),
            RawMaterial(code="BMT-817", name="Bismuth", grade="High Purity", unit="kg", minimum_stock=15.00),
            RawMaterial(code="LD-918", name="Lead Ingots", grade="99.9%", unit="kg", minimum_stock=800.00),
            RawMaterial(code="SLG-119", name="Slag Coagulant", grade="Industrial", unit="kg", minimum_stock=250.00),
            RawMaterial(code="BND-220", name="Resin Binder", grade="Furan", unit="liter", minimum_stock=1000.00),
            RawMaterial(code="SND-321", name="Silica Sand", grade="AFS 50", unit="ton", minimum_stock=100.00),
            RawMaterial(code="COT-422", name="Zircon Coating", grade="Premium", unit="kg", minimum_stock=300.00),
            RawMaterial(code="FRC-523", name="Ferro Chrome", grade="High Carbon", unit="ton", minimum_stock=8.00),
            RawMaterial(code="FLX-624", name="Flux Powder", grade="Standard", unit="kg", minimum_stock=450.00),
            RawMaterial(code="CRB-725", name="Carbon Raiser", grade="Graphite", unit="kg", minimum_stock=700.00),
        ]

        # if not RawMaterial.objects.using('surya_castings').exists():
        RawMaterial.objects.using('surya_castings').bulk_create(materials)
        print("✅ 5 Raw Materials added successfully to surya_castings!")
        # else:
        #     print("⚠️ Raw Materials already exist in surya_castings.")

    except Exception as e:
        print(f"❌ Failed to seed database. Did you create 'surya_castings' in MySQL and run migrations? Error: {e}")

if __name__ == '__main__':
    seed_surya_castings()
