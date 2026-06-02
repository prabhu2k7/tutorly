import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional
import aiofiles
from pathlib import Path
import uuid
from datetime import datetime

from config import Config
from services.document_processor import DocumentProcessor
from services.vector_store import VectorStore
from services.rag_service import RAGService
from services.kb_metadata import KBMetadataStore
from services.youtube_service import (
    YouTubeImportError,
    extract_video_id,
    fetch_transcript_segments,
    fetch_video_title,
)

config = Config()
document_processor = DocumentProcessor(config)
vector_store = VectorStore(config)
rag_service = RAGService(config, vector_store)
kb_metadata = KBMetadataStore(Path("kb_metadata.json"))


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


DEMO_KB_ID = "demo"
DEMO_COURSE_NAME = "Linear Algebra — Demo"
DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=fNk_zzaMoSs"


DEMO_SEED_PATH = Path("demo_seed.json")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure the demo KB is alive on startup.

    Three paths, in priority order:
      1. demo_seed.json present (shipped in the image) -> load chunks + embeddings
         directly into Chroma. Zero OpenAI cost, works on a public BYOK deploy.
      2. OPENAI_API_KEY set on the server -> fetch the YouTube transcript + embed
         it (one-off local-dev path; never the public-deploy path).
      3. Neither -> metadata still exists (so the share link doesn't 404), but
         content stays empty. Asking the bot returns a friendly empty-state.
    """
    try:
        kb_metadata.ensure(DEMO_KB_ID, DEMO_COURSE_NAME)
    except Exception as e:
        print(f"[warn] Could not ensure demo KB metadata: {e}")

    try:
        existing = vector_store.get_files(DEMO_KB_ID)
        if not existing and DEMO_SEED_PATH.exists():
            _seed_demo_kb_from_file(DEMO_SEED_PATH)
        elif not existing and config.OPENAI_API_KEY:
            await _seed_demo_kb()
        elif not existing:
            print("[seed] Demo KB metadata only; no demo_seed.json and no OPENAI_API_KEY.")
    except Exception as e:
        # Demo seeding is best-effort — never block startup.
        print(f"[warn] Demo KB seeding skipped: {e}")
    yield


def _seed_demo_kb_from_file(seed_path: Path):
    """Hydrate the demo KB from a pre-baked JSON file. No OpenAI calls."""
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    chunks = data.get("chunks") or []
    if not chunks:
        print(f"[seed] {seed_path.name} contained no chunks; skipping.")
        return
    kb_metadata.ensure(data.get("kb_id", DEMO_KB_ID), data.get("name") or DEMO_COURSE_NAME)
    vector_store.collection.add(
        ids=[c["id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks],
        embeddings=[c["embedding"] for c in chunks],
    )
    print(f"[seed] Demo KB hydrated from {seed_path.name} ({len(chunks)} chunks).")


def _require_api_key(x_openai_key: Optional[str]) -> str:
    """Strict BYOK: the OpenAI key MUST arrive in the X-OpenAI-Key header.

    No fallback to a server-side key — that would let anyone with the public
    URL burn the operator's wallet. The server-side OPENAI_API_KEY (if set)
    is reserved for one thing: a one-off local demo seed when no pre-baked
    seed JSON is shipped.
    """
    key = (x_openai_key or "").strip()
    if not key:
        raise HTTPException(
            status_code=401,
            detail="OpenAI API key required. Click the key icon in the top-right and paste yours.",
        )
    return key


app = FastAPI(title="Tutorly API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------

class CreateKBRequest(BaseModel):
    name: Optional[str] = None


class KBInfo(BaseModel):
    kb_id: str
    name: str
    created_at: str
    updated_at: str


class RenameKBRequest(BaseModel):
    name: str


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str


class FileInfo(BaseModel):
    file_id: str
    filename: str
    upload_date: str
    size_mb: float
    pages: int
    chars: int


class StatsResponse(BaseModel):
    total_files: int
    total_size_mb: float
    total_pages: int
    total_chars: int


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class YouTubeImportRequest(BaseModel):
    url: str


# ---------- Demo seeding ----------

async def _seed_demo_kb():
    print(f"[seed] Seeding demo KB '{DEMO_KB_ID}' with {DEMO_VIDEO_URL} ...")
    kb_metadata.ensure(DEMO_KB_ID, DEMO_COURSE_NAME)
    video_id = extract_video_id(DEMO_VIDEO_URL)
    if not video_id:
        print("[warn] Demo video URL could not be parsed; skipping seed.")
        return
    segments = fetch_transcript_segments(video_id)
    title = fetch_video_title(video_id)
    filename = f"{title} [YouTube {video_id}].txt"
    result = document_processor.process_timestamped_segments(segments)
    file_metadata = {
        "size_mb": len(result["text"].encode("utf-8")) / (1024 * 1024),
        "pages": result["pages"],
        "chars": result["chars"],
        "upload_date": datetime.now().isoformat(),
        "filename": filename,
        "source": "youtube",
        "youtube_video_id": video_id,
    }
    await rag_service.ingest_file(
        kb_id=DEMO_KB_ID,
        file_id=str(uuid.uuid4()),
        filename=filename,
        chunks=result["chunks"],
        file_metadata=file_metadata,
        api_key=config.OPENAI_API_KEY,
    )
    print(f"[seed] Demo KB seeded with '{title}'.")


# ---------- Routes ----------

@app.get("/api/info")
async def info():
    return {"name": "Tutorly API", "version": "0.3.0", "demo_kb_id": DEMO_KB_ID}


@app.post("/api/kb", response_model=KBInfo)
async def create_kb(payload: CreateKBRequest):
    """Mint a fresh knowledge base with a name."""
    name = (payload.name or "Untitled course").strip() or "Untitled course"
    kb_id = str(uuid.uuid4())
    entry = kb_metadata.create(kb_id, name)
    return KBInfo(**entry)


@app.get("/api/kb/{kb_id}", response_model=KBInfo)
async def get_kb(kb_id: str):
    entry = kb_metadata.get(kb_id)
    if not entry:
        # If chunks exist for this kb but no metadata, materialize a default.
        if vector_store.get_files(kb_id):
            entry = kb_metadata.ensure(kb_id, "Untitled course")
        else:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
    return KBInfo(**entry)


@app.patch("/api/kb/{kb_id}", response_model=KBInfo)
async def rename_kb(kb_id: str, payload: RenameKBRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    entry = kb_metadata.set_name(kb_id, name)
    if not entry:
        if vector_store.get_files(kb_id):
            entry = kb_metadata.ensure(kb_id, name)
        else:
            raise HTTPException(status_code=404, detail="Knowledge base not found")
    return KBInfo(**entry)


@app.post("/api/kb/{kb_id}/upload", response_model=UploadResponse)
async def upload_file(
    kb_id: str,
    file: UploadFile = File(...),
    x_openai_key: Optional[str] = Header(None),
):
    api_key = _require_api_key(x_openai_key)
    file_content = await file.read()
    file_size_mb = len(file_content) / (1024 * 1024)

    if file_size_mb > config.MAX_FILE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File size ({file_size_mb:.2f} MB) exceeds limit ({config.MAX_FILE_MB} MB)",
        )

    kb_stats = vector_store.get_stats(kb_id)
    if kb_stats["total_size_mb"] + file_size_mb > config.MAX_KB_MB:
        raise HTTPException(
            status_code=400,
            detail=f"KB storage would exceed limit ({config.MAX_KB_MB} MB)",
        )

    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix.lower()
    temp_path = UPLOAD_DIR / f"{file_id}{file_extension}"

    try:
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(file_content)

        result = await document_processor.process_document(
            file_path=temp_path, file_id=file_id, filename=file.filename
        )

        if result["pages"] > config.MAX_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Document has {result['pages']} pages, exceeds limit ({config.MAX_PAGES})",
            )
        if result["chars"] > config.MAX_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Document has {result['chars']} characters, exceeds limit ({config.MAX_CHARS})",
            )

        file_metadata = {
            "size_mb": file_size_mb,
            "pages": result["pages"],
            "chars": result["chars"],
            "upload_date": datetime.now().isoformat(),
            "filename": file.filename,
        }

        await rag_service.ingest_file(
            kb_id=kb_id,
            file_id=file_id,
            filename=file.filename,
            chunks=result["chunks"],
            file_metadata=file_metadata,
            api_key=api_key,
        )

        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            status="success",
            message=f"Uploaded: {result['pages']} pages, {result['chars']} characters.",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {e}")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.post("/api/kb/{kb_id}/youtube", response_model=UploadResponse)
async def import_youtube(
    kb_id: str,
    request: YouTubeImportRequest,
    x_openai_key: Optional[str] = Header(None),
):
    api_key = _require_api_key(x_openai_key)
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Could not parse a YouTube video id from that URL.")

    try:
        segments = fetch_transcript_segments(video_id)
    except YouTubeImportError as e:
        raise HTTPException(status_code=400, detail=str(e))

    title = fetch_video_title(video_id)
    filename = f"{title} [YouTube {video_id}].txt"

    full_text = " ".join(s["text"] for s in segments)
    text_size_mb = len(full_text.encode("utf-8")) / (1024 * 1024)
    if text_size_mb > config.MAX_FILE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"Transcript ({text_size_mb:.2f} MB) exceeds limit ({config.MAX_FILE_MB} MB)",
        )

    kb_stats = vector_store.get_stats(kb_id)
    if kb_stats["total_size_mb"] + text_size_mb > config.MAX_KB_MB:
        raise HTTPException(
            status_code=400,
            detail=f"KB storage would exceed limit ({config.MAX_KB_MB} MB)",
        )

    result = document_processor.process_timestamped_segments(segments)
    if result["chars"] > config.MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Transcript has {result['chars']} characters, exceeds limit ({config.MAX_CHARS})",
        )

    file_id = str(uuid.uuid4())
    file_metadata = {
        "size_mb": text_size_mb,
        "pages": result["pages"],
        "chars": result["chars"],
        "upload_date": datetime.now().isoformat(),
        "filename": filename,
        "source": "youtube",
        "youtube_video_id": video_id,
    }

    await rag_service.ingest_file(
        kb_id=kb_id,
        file_id=file_id,
        filename=filename,
        chunks=result["chunks"],
        file_metadata=file_metadata,
        api_key=api_key,
    )

    return UploadResponse(
        file_id=file_id,
        filename=filename,
        status="success",
        message=f"Imported transcript: {result['chars']} characters.",
    )


@app.post("/api/kb/{kb_id}/chat")
async def chat(
    kb_id: str,
    request: ChatRequest,
    x_openai_key: Optional[str] = Header(None),
):
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    api_key = _require_api_key(x_openai_key)
    try:
        response = await rag_service.chat(
            kb_id=kb_id,
            query=request.message,
            history=request.history,
            api_key=api_key,
        )
        return {"response": response["answer"], "sources": response.get("sources", [])}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/kb/{kb_id}/files", response_model=List[FileInfo])
async def get_files(kb_id: str):
    return vector_store.get_files(kb_id)


@app.delete("/api/kb/{kb_id}/files/{file_id}")
async def delete_file(kb_id: str, file_id: str):
    deleted = await vector_store.delete_file(kb_id=kb_id, file_id=file_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}


@app.get("/api/kb/{kb_id}/stats", response_model=StatsResponse)
async def get_stats(kb_id: str):
    return StatsResponse(**vector_store.get_stats(kb_id))


@app.get("/api/health")
async def health():
    server_has_key = bool(config.OPENAI_API_KEY)
    return {
        "ok": True,
        # When false, every API call MUST carry an X-OpenAI-Key header.
        "byok_required": not server_has_key,
        "server_key_present": server_has_key,
        "chat_model": config.CHAT_MODEL,
        "embedding_model": config.EMBEDDING_MODEL,
        "demo_kb_id": DEMO_KB_ID,
    }


# ---------- Static frontend (production / container) ----------
# Mount LAST so /api/* routes win. When FRONTEND_DIST is empty (dev mode),
# we skip static serving entirely — Vite handles the React side.
_FRONTEND_DIST = Path(config.FRONTEND_DIST) if config.FRONTEND_DIST else None
if _FRONTEND_DIST and _FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    async def spa_root():
        return FileResponse(_FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # API paths shouldn't reach here (routes match first), but be defensive.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = _FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
