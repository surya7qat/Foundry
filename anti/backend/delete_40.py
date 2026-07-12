import os
import django

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from inventory.models import Supplier, RawMaterial, Customer, PatternMaterial, Product, CoreBox, Pattern

def remove_limit_records():
    db = 'surya_castings'
    print(f"--- Removing max character-limit test records from [{db}] ---")
    
    # Order of deletion to respect Foreign Keys
    models_to_clean = [
        (Pattern, 'pattern_id'),
        (CoreBox, 'core_box_id'),
        (Product, 'product_id'),
        (PatternMaterial, 'material_id'),
        (Customer, 'customer_id'),
        (RawMaterial, 'code'),
        (Supplier, 'supplier_id')
    ]

    for model_class, field_name in models_to_clean:
        filter_kwargs = {f"{field_name}__icontains": "LIMIT"}
        deleted_count, _ = model_class.objects.using(db).filter(**filter_kwargs).delete()
        print(f"Cleaned {model_class.__name__}: Deleted {deleted_count} limit test records.")

    print("\nAll character-limit test records have been successfully deleted from the database!")

if __name__ == '__main__':
    remove_limit_records()
