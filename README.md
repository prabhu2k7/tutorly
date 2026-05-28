---
title: Tutorly
emoji: 🎓
colorFrom: purple
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Turn YouTube videos into an AI tutor for students
---

# Tutorly — AI Tutor for Course Creators

Turn your course material into an AI tutor that answers student questions 24/7 — so you stop answering the same questions every day.

A creator uploads their course material (PDF / DOCX / TXT) to a private knowledge base and gets a public share link to send to their students. Students open the link and chat with a tutor scoped strictly to that course.

See [MVP_PLAN.md](MVP_PLAN.md) for the product vision and [TEST_PLAN.md](TEST_PLAN.md) for how we know it works.

## Architecture

- **Backend**: FastAPI + ChromaDB. One collection, per-chunk `kb_id` tag for tenant isolation.
- **Frontend**: React (Vite) + Tailwind. Single app with two views — creator (default) and student (`?kb=<id>`).
- **AI**: OpenAI embeddings (`text-embedding-3-small`) and chat (`gpt-4o-mini`), held server-side.

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- An OpenAI API key (set once on the server, students never need one)

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with your OpenAI key:

```env
OPENAI_API_KEY=sk-your-key-here
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Run

In two terminals:

```bash
# terminal 1 — backend
cd backend
python main.py
```

```bash
# terminal 2 — frontend
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Using it

1. **First visit (creator):** The app mints a fresh knowledge base for you (the `kb_id` is stored in your browser's localStorage). You'll see an upload area and a share link.
2. **Upload course materials:** Drag and drop PDF / DOCX / TXT files. They're chunked, embedded, and stored in your KB.
3. **Copy the share link:** Click *Copy* on the indigo share-link panel. The link looks like `http://localhost:3000/?kb=<your-kb-id>`.
4. **Students open the link:** They see only the chat interface, scoped to your course material. No upload UI, no API key prompt.
5. **You can still chat from the creator view** to preview what students will see.

## API

All routes are scoped to a `kb_id`:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/kb` | Mint a new knowledge base, returns `{kb_id}` |
| `POST` | `/api/kb/{kb_id}/upload` | Upload + embed a document |
| `GET`  | `/api/kb/{kb_id}/files` | List files in this KB |
| `DELETE` | `/api/kb/{kb_id}/files/{file_id}` | Delete a file |
| `GET`  | `/api/kb/{kb_id}/stats` | Stats for this KB |
| `POST` | `/api/kb/{kb_id}/chat` | Ask a question (scoped to this KB) |

## Limits (per KB)

Configurable in [backend/config.py](backend/config.py):

```python
MAX_FILE_MB = 25         # max size of one file
MAX_KB_MB = 200          # max total storage in one KB
MAX_PAGES = 300          # max pages per document
MAX_CHARS = 3_000_000    # max characters per document
```

## How it works

1. **Ingestion:** Upload → extract text (PyPDF2 / python-docx) → clean → split into chunks → embed with OpenAI → store in ChromaDB, tagged with `kb_id`.
2. **Retrieval:** Student question → embed it → ChromaDB cosine search filtered by `kb_id` → top 5 chunks.
3. **Answering:** Retrieved chunks + recent chat history → `gpt-4o-mini` with a strict "answer only from materials" system prompt → answer + cited filenames.

## Known limitations (MVP)

- `kb_id` *is* the access token — anyone with the link can chat. Real auth comes in Phase 2.
- No streaming responses yet.
- No analytics dashboard ("top student questions") yet — Phase 2.
- No embeddable widget yet — students must open the share link.
- Chunking is character-based but overlap is applied as word count (see [backend/services/document_processor.py](backend/services/document_processor.py)). Works, but tune later.

## What's next (Phase 2)

- Accounts + login (real auth replacing the kb-as-token model)
- Embeddable JS widget so creators can drop the tutor inside their course platform
- "Top questions this week" dashboard — the real moat: showing creators where students get stuck
- Stripe billing
- Video transcript ingestion (course material is mostly video)
