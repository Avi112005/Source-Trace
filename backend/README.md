# Document Intelligence Backend

This is the FastAPI backend for the Document Intelligence + Agentic RAG application.

## Prerequisites

- Python 3.10+
- PostgreSQL (running locally)

## Local Setup

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in the values:
   ```bash
   copy .env.example .env
   ```
   *Make sure `DATABASE_URL` matches your local PostgreSQL setup.*

4. **Run the server**:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://127.0.0.1:8000`. You can test the health endpoint at `/health` or view the interactive docs at `/docs`.
