from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

def classify_document(text: str) -> dict:
    if not api_key:
        return {"status": "error", "message": "GROQ_API_KEY is missing from .env"}

    try:
        client = Groq(api_key=api_key)
        
        prompt = f"""
        Analyze the following document text and provide a classification.
        Identify:
        1. Document Type (e.g., Invoice, Contract, Report, ID, Unknown)
        2. Primary Topic
        3. Sensitivity (High, Medium, Low)
        
        Return the result strictly as a JSON object with keys: "type", "topic", "sensitivity".
        
        Document Text:
        {text[:5000]}
        """
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        return {"status": "success", "classification": response.choices[0].message.content}
    except Exception as e:
        return {"status": "error", "message": f"Classification failed: {str(e)}"}
