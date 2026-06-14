from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Response
from limiter import limiter
import os
import shutil
import uuid
from services.encryption import encrypt_data, decrypt_data
from services.ocr import extract_text_from_pdf
from services.classification import classify_document
from services.embeddings import store_document_embeddings
from database import get_db_connection

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

DATA_DIR = os.environ.get("DATA_DIR", ".")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
@limiter.limit("10/minute")
async def upload_document(request: Request, file: UploadFile = File(...)):
    session_id = request.headers.get("x-session-id", "00000000-0000-0000-0000-000000000000")
    valid_extensions = (".pdf", ".png", ".jpg", ".jpeg")
    if not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Only PDF and Image files are supported")
        
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
        
    magic_bytes = file_bytes[:8]
    is_pdf = magic_bytes.startswith(b'%PDF-')
    is_jpeg = magic_bytes.startswith(b'\xff\xd8\xff')
    is_png = magic_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    
    if not (is_pdf or is_jpeg or is_png):
        raise HTTPException(status_code=400, detail="Invalid file signature. Only actual PDF, PNG, and JPEG files are allowed.")
    
    await file.seek(0)
    
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    # Encrypt the raw payload
    encrypted_bytes = encrypt_data(file_bytes)
    
    with open(file_path, "wb") as buffer:
        buffer.write(encrypted_bytes)
        
    # Save to PostgreSQL
    conn = get_db_connection()
    db_id = None
    if conn:
        try:
            cursor = conn.cursor()
            # We use a dummy UUID since we skipped login/auth
            cursor.execute(
                "INSERT INTO documents (user_id, filename, file_path, status) VALUES (%s, %s, %s, %s) RETURNING id",
                (session_id, file.filename, file_path, "pending")
            )
            db_id = cursor.fetchone()["id"]
            conn.commit()
            cursor.close()
        except Exception as e:
            print(f"Failed to save to database: {e}")
        finally:
            conn.close()
            
    return {
        "message": "File uploaded successfully", 
        "file_id": file_id, 
        "filename": file.filename,
        "database_id": db_id
    }

@router.post("/{file_id}/process")
@limiter.limit("5/minute")
async def process_document(request: Request, file_id: str):
    session_id = request.headers.get("x-session-id", "00000000-0000-0000-0000-000000000000")
    # Find the file with any supported extension
    file_path = None
    for ext in [".pdf", ".png", ".jpg", ".jpeg"]:
        potential_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(potential_path):
            file_path = potential_path
            break
            
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
        
    # 1. OCR / Text Extraction & Image Rendering
    ocr_result = extract_text_from_pdf(file_path, file_id)
    if ocr_result["status"] == "error":
        raise HTTPException(status_code=500, detail=ocr_result["message"])
        
    pages_data = ocr_result.get("pages", [])
    full_text = " ".join([p["text"] for p in pages_data if p["text"]])
    
    # 2. Document Classification
    class_result = classify_document(full_text)
    
    # Get original filename from DB if possible
    filename = f"Document_{file_id[:8]}"
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT filename FROM documents WHERE file_path LIKE %s", (f"%{file_id}%",))
            row = cursor.fetchone()
            if row and row["filename"]:
                filename = row["filename"]
            cursor.close()
        except Exception as e:
            print(f"Could not retrieve filename from DB: {e}")
        finally:
            conn.close()

    # 3. Store Embeddings for RAG
    embed_result = store_document_embeddings(file_id, filename, pages_data, user_id=session_id)
    
    return {
        "file_id": file_id,
        "extracted_pages": len(pages_data),
        "classification": class_result.get("classification"),
        "embeddings_status": embed_result.get("status")
    }

@router.get("/image/{image_id}")
@limiter.limit("30/minute")
async def get_image(request: Request, image_id: str):
    image_path = os.path.join(DATA_DIR, "uploads", "page_images", image_id)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
        
    with open(image_path, "rb") as f:
        encrypted_bytes = f.read()
        
    decrypted_bytes = decrypt_data(encrypted_bytes)
    return Response(content=decrypted_bytes, media_type="image/png")
