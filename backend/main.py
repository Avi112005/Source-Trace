from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import documents, chat
import os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from dotenv import load_dotenv

load_dotenv()

# Read from DATA_DIR for Render Persistent Disk, fallback to current directory
DATA_DIR = os.environ.get("DATA_DIR", ".")

app = FastAPI(
    title="Document Intelligence API",
    description="Backend for OCR, Classification, and Agentic RAG",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Images are now served securely via the API endpoints.
os.makedirs(os.path.join(DATA_DIR, "uploads", "page_images"), exist_ok=True)

# Allow Next.js frontend to communicate with this backend
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "message": "FastAPI backend is running correctly!"
    }
