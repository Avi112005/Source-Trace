from groq import Groq
import chromadb
import os
from services.embeddings import model

DATA_DIR = os.environ.get("DATA_DIR", ".")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_or_create_collection(name="documents")

def query_documents(query: str, user_id: str, n_results: int = 3):
    if not model:
        return {}
        
    query_embedding = model([query])[0]
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"user_id": user_id}
    )
    
    return results

def generate_rag_response(messages: list, user_id: str = "00000000-0000-0000-0000-000000000000"):
    # Extract latest query
    latest_query = messages[-1].content
    
    # 1. Retrieve relevant contexts
    results = query_documents(latest_query, user_id, n_results=4)
    
    contexts = []
    if results and "documents" in results and results["documents"]:
        for i, doc_text in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            doc_name = meta.get("filename", meta.get("file_id", "Unknown")[:8])
            page = meta.get("page", "1")
            contexts.append(f"--- Source: {doc_name}, Page {page} ---\n{doc_text}\n")
            
    context_str = "\n".join(contexts)
    
    # 2. Format conversation history
    history_str = ""
    for msg in messages[:-1]:
        history_str += f"{msg.role.capitalize()}: {msg.content}\n"
    
    # 3. Strict Prompting
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    prompt = f"""
    You are an intelligent document assistant. You MUST strictly follow these rules:
    1. Answer the user's question using ONLY the provided Source context.
    2. If the answer is not in the context, you MUST say exactly: "I do not know based on the uploaded documents." Do not hallucinate or use outside knowledge.
    3. Every claim or sentence in your answer MUST end with an inline citation using the exact Source name and page provided in the context blocks. Example: [Document_abc123, Page 5].
    
    Conversation History:
    {history_str}
    
    Retrieved Context Sources:
    {context_str}
    
    Current Question: {latest_query}
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a precise, rule-following AI assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        answer_text = response.choices[0].message.content
        
        # Filter sources to only those actually cited by the AI
        all_sources = results.get("metadatas", [[]])[0] if results else []
        cited_sources = []
        seen_files = set()
        
        for source in all_sources:
            doc_name = source.get("filename", source.get("file_id", "Unknown")[:8])
            page_num = source.get("page", 1)
            # The AI might cite "[Document Name, Page X]"
            # To be robust, if doc_name is in text, let's include the citation if that specific page was retrieved
            if doc_name in answer_text:
                unique_cite_key = f"{doc_name}_page_{page_num}"
                if unique_cite_key not in seen_files:
                    cited_sources.append(source)
                    seen_files.add(unique_cite_key)
                    
        return {
            "answer": answer_text, 
            "sources": cited_sources
        }
    except Exception as e:
        error_msg = str(e)
        return {"status": "error", "message": error_msg}
