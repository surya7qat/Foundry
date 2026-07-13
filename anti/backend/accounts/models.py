from django.db import models
from django.contrib.auth.models import AbstractUser
import pymysql

class Client(models.Model):
    name = models.CharField(max_length=100, unique=True)
    api_endpoint = models.URLField(max_length=255, help_text="The URL React should connect to.")
    db_name = models.CharField(max_length=50, blank=True)
    db_host = models.CharField(max_length=100, default='localhost')
    db_user = models.CharField(max_length=100, default='root')
    db_password = models.CharField(max_length=100)
    db_port = models.IntegerField(default=3306)
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.db_name:
            self.db_name = f"client_{self.name.lower().replace(' ', '_')}"
        super().save(*args, **kwargs)
        if is_new:
            self.provision_database()
            
    def provision_database(self):
        """Connects to the MySQL server and creates the physical database."""
        try:
            # 1. Connect without a specific db to create it
            conn = pymysql.connect(
                host=self.db_host,
                user=self.db_user,
                password=self.db_password,
                port=self.db_port
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.db_name}")
            conn.commit()
            conn.close()
            
            # 2. Add it to Django's settings dynamically and run migrations
            from django.core.management import call_command
            from django.conf import settings
            settings.DATABASES[self.db_name] = {
                'ENGINE': 'django.db.backends.mysql',
                'NAME': self.db_name,
                'USER': self.db_user,
                'PASSWORD': self.db_password,
                'HOST': self.db_host,
                'PORT': str(self.db_port),
            }
            call_command('migrate', database=self.db_name)
            print(f"Successfully provisioned database: {self.db_name}")
        except Exception as e:
            print(f"Failed to provision DB for {self.name}: {e}")

class Role(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=100)
    # Checkboxes for menus
    can_access_dashboard = models.BooleanField(default=True)
    can_access_supplier_master = models.BooleanField(default=False)
    can_access_raw_material_master = models.BooleanField(default=False)
    can_access_customer_master = models.BooleanField(default=False)
    can_access_pattern_material_master = models.BooleanField(default=False)
    can_access_product_master = models.BooleanField(default=False)
    can_access_core_box_master = models.BooleanField(default=False)
    can_access_pattern_master = models.BooleanField(default=False)
    can_access_purchase_inward = models.BooleanField(default=False)
    can_access_purchase_rejection = models.BooleanField(default=False)
    can_access_purchase_return = models.BooleanField(default=False)
    can_access_material_stock = models.BooleanField(default=False)
    can_access_material_stock_log = models.BooleanField(default=False)
    can_access_product_stock = models.BooleanField(default=False)
    can_access_product_stock_log = models.BooleanField(default=False)

    class Meta:
        unique_together = ('client', 'name')

    def __str__(self):
        return f"{self.name} ({self.client.name})"

class UserAccessPermission(models.Model):
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='access_permission')
    show_customer_to_all_departments = models.BooleanField(default=True)
    show_supplier_to_all_departments = models.BooleanField(default=True)
    supplier_to_show = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Permissions for {self.client.name}"

class CustomUser(AbstractUser):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    show_customer_to_all_departments = models.BooleanField(default=True)
    show_supplier_to_all_departments = models.BooleanField(default=True)

