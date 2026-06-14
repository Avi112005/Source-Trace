# Source Trace: Agentic Data Cloud

Source Trace is a scalable, cloud-native Document Intelligence Platform. It allows users to securely upload messy documents (PDFs, Images) and instantly transform them into a searchable, agentic knowledge base. Built using a modern Next.js frontend and a FastAPI Python backend, it leverages Agentic RAG, advanced OCR, and strict encryption to interact with private data safely and accurately.

---

## Architecture & File Structure

The project is structured as a Monorepo containing both the Frontend and Backend to streamline deployment and development.

```text
Source-Trace/
├── frontend/                 # Next.js App Router (React, TailwindCSS)
│   ├── src/components/       # Reusable UI components (ChatWindow, FileUploader)
│   ├── src/app/              # Next.js Routing and Pages
│   └── package.json          # Node dependencies
├── backend/                  # FastAPI Python Server
│   ├── routers/              # API Endpoints (upload, chat)
│   ├── services/             # Core Business Logic (ocr.py, rag.py, encryption.py)
│   ├── database.py           # Supabase connection & pooling
│   └── main.py               # Application entry point
├── railway.toml              # Infrastructure-as-Code for Backend Deployment
├── Aptfile                   # System-level OCR dependencies (Railway)
└── requirements.txt          # Root Python dependencies for cloud deployment
```

---

## Security Implementation & Architecture Decisions

Security is built into Source Trace at every single layer of the stack to ensure zero data leakage.

### 1. Upload & API Layer
- **Strict Rate Limiting:** Prevent DDoS attacks and abuse. The `upload` endpoint is throttled to 10 requests/minute, and the `chat` endpoint is throttled to 5 requests/minute using `slowapi`.
- **CORS Protection:** The FastAPI backend uses a strict `allow_origins` policy, hardcoded to ONLY accept API requests from the verified production Vercel domain.
- **XSS Sanitization:** All user chat input is processed through strict HTML escaping before hitting the AI or the database.

### 2. Storage Layer (Encryption at Rest)
- **Zero Plaintext:** When a document is uploaded, it is never saved to the disk as raw data. Every single PDF page and extracted thumbnail image is passed through `cryptography.fernet` and encrypted at rest using **AES-256 Symmetric Encryption**.
- **Metadata Separation:** Vector embeddings are stored locally in ChromaDB, while relational metadata is stored securely in an external Supabase PostgreSQL database using an IPv4 connection pooler to prevent credential exposure.

### 3. Retrieval Layer (Agentic RAG)
- **PII Scrubbing:** During the OCR extraction phase, a custom Regular Expression scrubber automatically detects and redacts Sensitive Information (Social Security Numbers, Credit Cards) before the data is chunked and embedded.
- **Strict AI Prompting:** The `Groq` Llama-3.3-70B model is bound by a strict System Prompt to prevent hallucinations. It is ordered to *only* use the provided context and reply "I do not know" if the answer is missing.
### Security Decisions
**What was implemented:**
- AES-256 Fernet Encryption at rest for all PDF pages and image thumbnails.
- Strict FastAPI CORS middleware tied explicitly to the production Vercel domain.
- PII scrubbing regex to dynamically redact Social Security Numbers and Credit Cards from the Vector Database.
- Strict system prompting to prevent AI hallucinations and enforce citations.
- API Rate limiting (slowapi) to prevent abuse of the heavy OCR endpoints.

**What was considered but skipped:**
- *End-to-End Encryption (E2EE):* We considered encrypting documents on the client-side before uploading, but skipped this because the Python backend needs access to the raw PDF bytes to perform Tesseract OCR and extract Markdown tables.
- *Role-Based Access Control (RBAC):* We skipped implementing a full multi-tenant OAuth system (like Clerk or Auth0) to prioritize core RAG architecture and OCR accuracy for the initial deployment.

**What we would add given more time:**
- Implement automated malware scanning (e.g., ClamAV) on uploaded PDFs before parsing.
- Deploy a dedicated Redis cluster for distributed rate-limiting instead of in-memory limiting.
- Migrate from Symmetric Fernet Encryption to AWS KMS (Key Management Service) for enterprise-grade key rotation.

---

## Deployment Instructions

This repository is designed to be instantly deployed via **Vercel** (Frontend) and **Railway** (Backend).

### Backend (Railway)
1. Fork/Clone this repository and link it to Railway.
2. Railway will automatically detect the root `railway.toml` and `Aptfile`. It will dynamically install Python 3.11, `tesseract-ocr`, and `poppler-utils`.
3. Add your Environment Variables in the Railway Dashboard:
   - `GROQ_API_KEY`: Your Groq AI token.
   - `DATABASE_URL`: Your Supabase Transaction Pooler URL.
   - `ENCRYPTION_KEY`: A 32-byte url-safe base64 encoded Fernet key.
   - `FRONTEND_URL`: Your live Vercel domain.

### Frontend (Vercel)
1. Link the repository to Vercel.
2. Vercel will automatically detect the `frontend` folder.
3. Add your Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your live Railway backend domain (e.g., `https://your-app.up.railway.app/api/v1`).
4. Click Deploy.

---

## Code Quality & Secrets Management
- **No Hardcoded Secrets:** All API keys, passwords, and encryption keys are strictly managed via `.env` files locally and secure Dashboard Variables in production.
- **.gitignore Enforcement:** A rigorous `.gitignore` ensures that `chroma_db`, `uploads/`, `venv`, and `.env` files are never accidentally committed to version control.
