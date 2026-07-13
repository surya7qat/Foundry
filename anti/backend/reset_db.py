import pymysql
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / '.env')

host = os.getenv('DB_HOST', 'localhost')
user = os.getenv('DB_USER', 'root')
password = os.getenv('DB_PASSWORD', 'Harini@1415')
port = int(os.getenv('DB_PORT', 3306))
db_name = os.getenv('DB_NAME', 'castings')
tenant_db_name = os.getenv('DB_TENANT_NAME', 'surya_castings')

print(f"Connecting to MySQL server {host}:{port} as {user}...")

try:
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        port=port
    )
    cursor = conn.cursor()

    # 1. Reset Central DB (defaultdb / castings)
    # If the central DB is 'defaultdb', we cannot drop the database itself on Aiven MySQL, so we drop all its tables.
    if db_name.lower() == 'defaultdb':
        print(f"Clearing all tables in central database [{db_name}]...")
        cursor.execute(f"USE {db_name};")
        cursor.execute("SHOW TABLES;")
        tables = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        for table in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {table};")
            print(f"  Dropped table: {table}")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    else:
        print(f"Dropping and recreating database [{db_name}]...")
        cursor.execute(f"DROP DATABASE IF EXISTS {db_name};")
        cursor.execute(f"CREATE DATABASE {db_name};")

    # 2. Reset Tenant DB (surya_castings)
    print(f"Dropping and recreating tenant database [{tenant_db_name}]...")
    cursor.execute(f"DROP DATABASE IF EXISTS {tenant_db_name};")
    cursor.execute(f"CREATE DATABASE {tenant_db_name};")
    
    conn.commit()
    conn.close()
    print("Database reset completed successfully!")
except Exception as e:
    print(f"Error resetting databases: {e}")
