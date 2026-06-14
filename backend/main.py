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
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import HTMLResponse

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <title>Source Trace API</title>
        <meta http-equiv="refresh" content="0; url={frontend_url}" />
      </head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h2>API is Online! ✅</h2>
        <p>If you are not redirected automatically, <a href="{frontend_url}">click here to go to the frontend</a>.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

app.include_router(documents.router)
app.include_router(chat.router)

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok", 
        "message": "FastAPI backend is running correctly!"
    }
