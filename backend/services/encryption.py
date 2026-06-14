from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get("ENCRYPTION_KEY")
if key:
    fernet = Fernet(key.encode())
else:
    fernet = None
    print("WARNING: ENCRYPTION_KEY not set. Files will not be encrypted.")

def encrypt_data(data: bytes) -> bytes:
    if not fernet:
        return data
    return fernet.encrypt(data)

def decrypt_data(data: bytes) -> bytes:
    if not fernet:
        return data
    try:
        return fernet.decrypt(data)
    except Exception:
        # Fallback to plain text if decryption fails (e.g., for legacy unencrypted files)
        return data
