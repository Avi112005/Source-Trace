# backend/auth.py

"""Authentication utilities for FastAPI using OAuth2 password flow and JWT.
This module provides:
- Password hashing/verification (passlib bcrypt)
- JWT creation & verification (python-jose)
- Dependency to retrieve the current user from the token.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme expecting a token at the "token" endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

from .db import supabase

# Supabase user lookup
def get_user(email: str) -> Optional[dict]:
    # Query Supabase "users" table for a row with matching email
    result = supabase.table("users").select("email,hashed_password,disabled").eq("email", email).execute()
    data = result.data
    if not data:
        return None
    # Supabase returns a list of dicts
    user_record = data[0]
    return {
        "email": user_record.get("email"),
        "hashed_password": user_record.get("hashed_password"),
        "disabled": user_record.get("disabled", False),
    }

def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    if user.get("disabled"):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(email)
    if user is None:
        raise credentials_exception
    return user
