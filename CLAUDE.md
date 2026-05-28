# Tutorly

A SaaS product (in development) that turns a course creator's YouTube videos and documents into an AI tutor their students can chat with.

> The repo folder may be renamed at any time — this file lives at the project root and travels with it. Don't depend on the folder name `custom-rag` (or whatever it's named today) anywhere.

## Product positioning

- **Customer**: online course creators (Teachable / Kajabi / Thinkific / Podia / Skool / Maven / Gumroad).
- **Pitch**: *"Paste your YouTube videos → get a 24/7 AI tutor for your students, scoped strictly to your content."*
- **Differentiator (not just any RAG product)**: clickable timestamp citations that deep-link back to the exact moment in the source YouTube video. ChatGPT / Claude / Gemini cannot do this for a creator's course.
- **Phase**: pre-pilot, local-only MVP. No accounts, no billing yet.
- See [MVP_PLAN.md](MVP_PLAN.md) for scope and [TEST_PLAN.md](TEST_PLAN.md) for acceptance criteria.

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI (Python 3.12), uvicorn |
| Vector store | ChromaDB (persistent, on-disk at `backend/chroma_db/`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Chat model | OpenAI `gpt-4o-mini` |
| YouTube transcript | `youtube-transcript-api` ≥ 1.2.4 (no API key; uses YouTube's public caption endpoint) |
| YouTube title | YouTube oEmbed (no API key) |
| Frontend | React 18 + Vite + Tailwind CSS |
| KB metadata | `backend/kb_metadata.json` (JSON, thread-safe writer) |

## How to run (Windows)

The system `python` here is the Microsoft Store stub. Use the `py` launcher to pick Python 3.12.

```powershell
# One-time setup
cd backend
py -3.12 -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
# Copy .env.example -> .env, fill in OPENAI_API_KEY

cd ..\frontend
npm install

# Each run
# terminal 1
cd backend && venv\Scripts\python.exe main.py        # http://localhost:8000
# terminal 2
cd frontend && npm run dev                            # http://localhost:3000
```

`OPENAI_API_KEY` is loaded from `backend/.env` via `pydantic-settings`. Never restore the original BYO-key-from-browser pattern.

## Architecture

- **Multi-tenant via `kb_id`** — every chunk's metadata carries a `kb_id`; every read/write filters by it. Two creators' content cannot leak into each other.
- **`kb_id` IS the access token (for now)** — anyone with the link can chat. Real auth is Phase 2. UUID v4 in production; the special id `"demo"` is reserved for the bundled demo KB.
- **Creator UI vs Student UI** — same React app, switched by `?kb=<id>` query param. No query param → creator dashboard (reads `kb_id` from localStorage). With `?kb=<id>` → student chat view.
- **Demo KB auto-seeding** — on backend startup, if KB `demo` has no files, it is auto-populated with 3Blue1Brown's *Vectors | Chapter 1, Essence of linear algebra*. Controlled by `DEMO_VIDEO_URL` in `main.py`. The Welcome screen has a "Try the demo" button that opens `/?kb=demo`.

## Key files

| File | Role |
|---|---|
| `backend/main.py` | FastAPI app, all KB-scoped routes, demo-KB lifespan seeder |
| `backend/config.py` | `pydantic-settings`, reads `.env` |
| `backend/services/youtube_service.py` | URL parsing, oEmbed title, **timestamped** transcript fetch |
| `backend/services/document_processor.py` | Text extraction (PDF/DOCX/TXT) + two chunkers: `process_document` (file-based) and `process_timestamped_segments` (YouTube — preserves `start_time` per chunk) |
| `backend/services/rag_service.py` | Embeddings + chat; builds *structured* sources with timestamps; strict system prompt that refuses out-of-scope answers |
| `backend/services/vector_store.py` | ChromaDB wrapper, kb_id-filtered |
| `backend/services/kb_metadata.py` | JSON-backed KB name/created_at store (so KBs can have human names) |
| `frontend/src/App.jsx` | Creator vs Student view routing + Creator dashboard |
| `frontend/src/components/WelcomeScreen.jsx` | First-run onboarding (Try-demo + course name) |
| `frontend/src/components/ChatInterface.jsx` | Chat UI; `SourceChip` renders clickable YouTube-timestamp citations |
| `frontend/src/components/YoutubeImport.jsx` | YouTube URL input |
| `frontend/src/components/FileUpload.jsx` | Drag-drop PDF/DOCX/TXT upload |

## API surface — all KB-scoped

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/kb` | body `{name}` → `{kb_id, name, created_at, updated_at}` |
| `GET` | `/api/kb/{kb_id}` | metadata; materializes a default entry if Chroma has chunks but no metadata file row |
| `PATCH` | `/api/kb/{kb_id}` | rename, body `{name}` |
| `POST` | `/api/kb/{kb_id}/upload` | multipart, PDF/DOCX/TXT |
| `POST` | `/api/kb/{kb_id}/youtube` | body `{url}` |
| `GET` | `/api/kb/{kb_id}/files` | |
| `DELETE` | `/api/kb/{kb_id}/files/{file_id}` | |
| `GET` | `/api/kb/{kb_id}/stats` | per-KB quota stats |
| `POST` | `/api/kb/{kb_id}/chat` | body `{message, history}` → `{response, sources[]}` |

### `/chat` source shape

```json
{
  "label": "Vectors | Chapter 1, Essence of linear algebra",
  "timestamp_label": "1:51",
  "url": "https://www.youtube.com/watch?v=fNk_zzaMoSs&t=111s",
  "filename": "Vectors | Chapter 1 [YouTube fNk_zzaMoSs].txt",
  "youtube_video_id": "fNk_zzaMoSs",
  "start_time": 111.42
}
```

`url`, `timestamp_label`, `youtube_video_id`, `start_time` are only present for YouTube-sourced chunks. Non-YouTube sources have just `label` and `filename`. The frontend's `SourceChip` (`ChatInterface.jsx`) renders the YouTube case as a clickable red play-icon chip, otherwise as a plain text chip.

## Conventions / gotchas

- **No emojis in `print()` on Windows.** The console is cp1252 and emoji prints raise `UnicodeEncodeError`, which can crash the lifespan startup. Use plain prefixes (`[seed]`, `[warn]`). We've been bitten once already.
- **Never re-add `delete_collection` on startup.** The original code wiped all data on every restart as a workaround for an old embedding-dimension mismatch. The mismatch is fixed; the wipe is gone. Don't bring it back.
- **Chunker note (known imperfection):** `CHUNK_SIZE` is in characters but the PDF/DOCX overlap math (`current_chunk[-overlap:]`) is a word slice — works but inefficient (chunks nearly duplicate each other). YouTube uses `process_timestamped_segments` which doesn't suffer from this. Don't "fix" without re-running the retrieval test suite — the demo answers are validated against current behavior.
- **OpenAI key is server-side only.** Never restore the BYO-API-key-from-browser pattern from the original commit.
- **Old ChromaDB data may be incompatible** when metadata schema changes. Safe full reset:
  ```powershell
  Remove-Item -Recurse -Force backend\chroma_db, backend\uploads
  Remove-Item backend\kb_metadata.json -ErrorAction SilentlyContinue
  ```
  The demo KB will re-seed on next backend startup.
- **`.env`, `chroma_db/`, `uploads/`, `kb_metadata.json` are all in `.gitignore`.** Don't commit them.

## What's NOT yet built (deferred to Phase 2+)

Don't add these without checking in:

- User accounts / login (kb_id-as-token is the current model)
- Stripe billing
- Embeddable JS widget for course platforms
- **"Top student questions" analytics dashboard** — the eventual real moat
- YouTube **playlist** bulk import (single video works today)
- Streaming chat responses
- Auto-generated suggested questions (currently the empty state just shows a greeting)
- Mobile-specific polish
- Video transcript ingestion sources other than YouTube (e.g. Vimeo, Loom)

## Testing

See [TEST_PLAN.md](TEST_PLAN.md):
- T1–T10 functional tests (incl. **T6 tenant isolation** which is critical for a multi-creator product)
- 10 sample student questions against the bundled 3B1B vectors demo
- Manual smoke flow: open `localhost:3000` for creator → onboard → import a video → copy share link → open in incognito for student preview

## Marketing-relevant context

- The product is for solo developers building a SaaS, not for selling generic doc-chat (commoditized).
- Distribution thesis: get listed in course-platform app marketplaces (Teachable / Kajabi / Thinkific). That's the wedge a solo founder can win on.
- Validation strategy: 8–10 cold conversations with real course creators before building Phase 2 features. See conversation in the parent session for the outreach playbook.
