import chromadb
import chromadb.utils.embedding_functions as embedding_functions
import os

# Initialize Local ChromaDB
CHROMA_DIR = "chroma_db"
os.makedirs(CHROMA_DIR, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_or_create_collection(name="documents")

# Load ONNX embedding model (highly memory efficient)
try:
    model = embedding_functions.DefaultEmbeddingFunction()
except Exception as e:
    print(f"Warning: Could not load ONNX embedding function: {e}")
    model = None

def store_document_embeddings(file_id: str, filename: str, pages_data: list, user_id: str = "00000000-0000-0000-0000-000000000000"):
    if not model:
        return {"status": "error", "message": "Embedding model not loaded"}

    total_chunks = 0
    try:
        for page in pages_data:
            text = page.get("text", "").strip()
            if not text:
                continue
                
            # Naive chunking (500 chars per chunk)
            chunks = [text[i:i+500] for i in range(0, len(text), 500)]
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{file_id}_p{page['page_number']}_c{i}"
                # ChromaDB DefaultEmbeddingFunction takes a list of strings and returns a list of embeddings
                embedding = model([chunk])[0]
                
                collection.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{"file_id": file_id, "filename": filename, "page": page.get("page_number", 1), "user_id": user_id, "image_url": page.get("image_url", "")}]
                )
                total_chunks += 1
                
        return {"status": "success", "message": f"Stored {total_chunks} embeddings in ChromaDB"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
