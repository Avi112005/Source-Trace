# backend/config.py

"""Configuration utilities for the FastAPI backend.
Loads environment variables from a .env file and provides
typed access to required settings.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-me")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Supabase settings (production only; not used in local dev)
    # SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    # SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

settings = Settings()
