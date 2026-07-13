import os
import django
from pathlib import Path
from dotenv import load_dotenv

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import Client, CustomUser

def create_surya():
    print("Creating Client: Surya Castings...")
    client, created = Client.objects.get_or_create(
        name="Surya Castings",
        defaults={
            "api_endpoint": os.getenv('PROD_API_ENDPOINT', 'http://127.0.0.1:8000'),
            "db_name": os.getenv('DB_TENANT_NAME', 'surya_castings'),
            "db_host": os.getenv('DB_HOST', 'localhost'),
            "db_user": os.getenv('DB_USER', 'root'),
            "db_password": os.getenv('DB_PASSWORD', 'Harini@1415'),
            "db_port": int(os.getenv('DB_PORT', 3306))
        }
    )
    if created:
        print("Client created successfully.")
    else:
        print("Client already exists.")

    print("Creating User: surya...")
    user, user_created = CustomUser.objects.get_or_create(
        username="surya",
        defaults={
            "email": "surya@castings.com",
            "client": client,
            "is_staff": True,
            "is_superuser": True
        }
    )
    if user_created:
        user.set_password("Surya@123")
        user.save()
        print("User created successfully with password Surya@123.")
    else:
        # Update user's client if needed
        user.client = client
        user.set_password("Surya@123")
        user.save()
        print("User already existed, updated client and password.")

if __name__ == '__main__':
    create_surya()
