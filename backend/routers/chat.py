from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import html
from limiter import limiter
from typing import List
from services.rag import generate_rag_response

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@router.post("/")
@limiter.limit("5/minute")
async def chat_with_documents(request: Request, body: ChatRequest):
    if not body.messages or len(body.messages) == 0:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty")
        
    # XSS Protection: Escape all user input
    for msg in body.messages:
        msg.content = html.escape(msg.content)
        
    session_id = request.headers.get("x-session-id", "00000000-0000-0000-0000-000000000000")
        
    try:
        response = generate_rag_response(body.messages, user_id=session_id)
        if isinstance(response, dict) and response.get("status") == "error":
            raise HTTPException(status_code=500, detail=response.get("message"))
            
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
from groq import Groq
import os

@router.post("/transcribe")
@limiter.limit("10/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    try:
        audio_bytes = await file.read()
        
        # Groq's whisper model accepts a tuple of (filename, file_bytes)
        transcription = client.audio.transcriptions.create(
            file=("audio.webm", audio_bytes),
            model="whisper-large-v3"
        )
        return {"text": transcription.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
