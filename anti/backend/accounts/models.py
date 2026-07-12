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

class CustomUser(AbstractUser):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
