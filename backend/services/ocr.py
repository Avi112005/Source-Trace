import pdfplumber
import fitz  # PyMuPDF
import os
import shutil
from groq import Groq
from dotenv import load_dotenv
import base64
import tempfile
from services.encryption import decrypt_data, encrypt_data
from services.pii_scrubber import scrub_pii

load_dotenv()

DATA_DIR = os.environ.get("DATA_DIR", ".")
IMAGES_DIR = os.path.join(DATA_DIR, "uploads", "page_images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Cloud platform auto-detection for image URLs. Fallback to localhost.
if "RENDER_EXTERNAL_URL" in os.environ:
    BASE_URL = os.environ["RENDER_EXTERNAL_URL"]
elif "RAILWAY_PUBLIC_DOMAIN" in os.environ:
    BASE_URL = f"https://{os.environ['RAILWAY_PUBLIC_DOMAIN']}"
else:
    BASE_URL = "http://127.0.0.1:8000"

def extract_text_from_pdf(file_path: str, file_id: str) -> dict:
    pages_data = []
    
    # 1. Decrypt file into a temporary file
    with open(file_path, "rb") as enc_file:
        decrypted_bytes = decrypt_data(enc_file.read())
        
    try:
        if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            try:
                # Encrypt the copied image to maintain encryption at rest for thumbnails
                img_path = os.path.join(IMAGES_DIR, f"{file_id}_page_1.png")
                with open(img_path, "wb") as f:
                    f.write(encrypt_data(decrypted_bytes))
                
                client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
                base64_img = base64.b64encode(decrypted_bytes).decode('utf-8')
                
                response = client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Extract all text from this image exactly as written. Do not describe the image, just output the text. If there is no text, return 'No readable text found.'"},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}},
                            ],
                        }
                    ],
                    temperature=0.1
                )
                text = response.choices[0].message.content.strip()
                
                pages_data.append({
                    "page_number": 1,
                    "text": scrub_pii(text if text else "No readable text found."),
                    "image_url": f"{BASE_URL}/api/v1/documents/image/{file_id}_page_1.png"
                })
                return {"status": "success", "pages": pages_data}
            except Exception as e:
                return {"status": "error", "message": f"Image OCR failed: {str(e)}"}

        # Write decrypted bytes to a temp file for PyMuPDF and pdfplumber
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(decrypted_bytes)
            tmp_path = tmp.name

        try:
            # Generate encrypted thumbnails
            pdf_document = fitz.open(tmp_path)
            for page_num in range(len(pdf_document)):
                page = pdf_document.load_page(page_num)
                pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
                img_path = os.path.join(IMAGES_DIR, f"{file_id}_page_{page_num + 1}.png")
                # Save plain temporarily, then read, encrypt, and rewrite
                pix.save(img_path)
                with open(img_path, "rb") as f:
                    plain_img = f.read()
                with open(img_path, "wb") as f:
                    f.write(encrypt_data(plain_img))
            pdf_document.close()

            # Extract text
            with pdfplumber.open(tmp_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    
                    # Extract tables as structured Markdown
                    tables = page.extract_tables()
                    for table in tables:
                        if not table: continue
                        text += "\n\n"
                        for row_idx, row in enumerate(table):
                            clean_row = [str(cell).replace("\n", " ") if cell is not None else "" for cell in row]
                            text += "| " + " | ".join(clean_row) + " |\n"
                            if row_idx == 0:
                                text += "|" + "|".join(["---"] * len(row)) + "|\n"
                    pages_data.append({
                        "page_number": i + 1,
                        "text": scrub_pii(text.strip()),
                        "image_url": f"{BASE_URL}/api/v1/documents/image/{file_id}_page_{i + 1}.png"
                    })
        finally:
            os.remove(tmp_path)
            
        return {"status": "success", "pages": pages_data}
    except Exception as e:
        return {"status": "error", "message": f"Failed to extract text: {str(e)}"}

def perform_ocr_on_page(pdf_path: str, page_index: int) -> str:
    try:
        # Note: poppler_path might be needed on Windows for convert_from_path
        images = convert_from_path(pdf_path, first_page=page_index+1, last_page=page_index+1)
        if images:
            return pytesseract.image_to_string(images[0])
    except Exception as e:
        print(f"OCR Error: {e}. Please ensure Tesseract and Poppler are installed on Windows.")
        return "[OCR Failed or Binaries Not Installed]"
    return ""
