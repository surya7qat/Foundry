import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import Client, CustomUser

def create_surya():
    print("Creating Client: Surya Castings...")
    client, created = Client.objects.get_or_create(
        name="Surya Castings",
        defaults={
            "api_endpoint": "http://127.0.0.1:8000",
            "db_name": "surya_castings",
            "db_host": "localhost",
            "db_user": "root",
            "db_password": "Harini@1415",
            "db_port": 3306
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
