import pymysql
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / '.env')

try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'Harini@1415'),
        port=int(os.getenv('DB_PORT', 3306))
    )
    cursor = conn.cursor()
    cursor.execute("DROP DATABASE IF EXISTS castings;")
    cursor.execute("CREATE DATABASE castings;")
    cursor.execute("DROP DATABASE IF EXISTS surya_castings;")
    cursor.execute("CREATE DATABASE surya_castings;")
    conn.commit()
    conn.close()
    print("Successfully dropped and recreated both 'castings' and 'surya_castings' databases.")
except Exception as e:
    print(f"Error resetting databases: {e}")
