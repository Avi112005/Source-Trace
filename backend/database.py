import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and "your_db" in DATABASE_URL:
    # Auto-correct the placeholder from .env.example
    DATABASE_URL = DATABASE_URL.replace("your_db", "doc_intel_dev")
elif not DATABASE_URL:
    # Fallback if no .env
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/doc_intel_dev"

def get_db_connection():
    """
    Creates a connection to the PostgreSQL database.
    Returns a connection object where queries return dictionaries.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None
