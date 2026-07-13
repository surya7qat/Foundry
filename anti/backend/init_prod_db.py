import pymysql
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

def init_databases():
    print("Connecting to the database server to initialize schemas...")
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'Harini@1415'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        cursor = conn.cursor()
        
        db_default = os.getenv('DB_NAME', 'castings')
        db_tenant = os.getenv('DB_TENANT_NAME', 'surya_castings')
        
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_default};")
        print(f"Verified / Created central database: {db_default}")
        
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_tenant};")
        print(f"Verified / Created tenant database: {db_tenant}")
        
        conn.commit()
        conn.close()
        print("Database schema initialization complete.")
    except Exception as e:
        print(f"Error checking/initializing database schemas: {e}")

if __name__ == '__main__':
    init_databases()
