import PyPDF2
from docx import Document
from pathlib import Path
from typing import Dict, List, Optional
import re


class DocumentProcessor:
    def __init__(self, config):
        self.config = config

    async def process_document(self, file_path: Path, file_id: str, filename: str) -> Dict:
        """Extract text from a file on disk, then chunk it."""
        file_extension = file_path.suffix.lower()

        if file_extension == ".pdf":
            text, pages = self._extract_pdf(file_path)
        elif file_extension in [".docx", ".doc"]:
            text, pages = self._extract_docx(file_path)
        elif file_extension == ".txt":
            text, pages = self._extract_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

        return self._build_result(text, pages)

    def process_text(self, text: str) -> Dict:
        """Chunk a raw string (e.g. a YouTube transcript)."""
        words = len(text.split())
        pages = max(1, words // 500)
        return self._build_result(text, pages)

    def process_timestamped_segments(self, segments: List[Dict]) -> Dict:
        """Chunk timestamped segments (e.g. YouTube transcript) keeping the
        start time of each chunk so citations can deep-link to the right moment.

        Each input segment: {"text": str, "start": float seconds, "duration": float seconds}.
        Returned chunks include a "start_time" field (seconds, float).
        """
        cleaned_segments = [
            {
                "text": self._clean_text(s["text"]),
                "start": s.get("start", 0.0),
                "duration": s.get("duration", 0.0),
            }
            for s in segments
            if s.get("text") and s["text"].strip()
        ]

        chunk_size = self.config.CHUNK_SIZE
        chunks: List[Dict] = []
        current_text_parts: List[str] = []
        current_length = 0
        current_start: Optional[float] = None
        chunk_index = 0

        def flush():
            nonlocal current_text_parts, current_length, current_start, chunk_index
            if not current_text_parts:
                return
            chunk_text = " ".join(current_text_parts).strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "chunk_index": chunk_index,
                    "start_time": float(current_start or 0.0),
                })
                chunk_index += 1
            current_text_parts = []
            current_length = 0
            current_start = None

        for seg in cleaned_segments:
            seg_text = seg["text"]
            seg_len = len(seg_text) + 1
            if current_start is None:
                current_start = seg["start"]
            if current_length + seg_len > chunk_size and current_text_parts:
                flush()
                current_start = seg["start"]
            current_text_parts.append(seg_text)
            current_length += seg_len

        flush()

        full_text = " ".join(s["text"] for s in cleaned_segments)
        chars = len(full_text)
        words = len(full_text.split())
        pages = max(1, words // 500)

        return {
            "chunks": chunks,
            "pages": pages,
            "chars": chars,
            "text": full_text,
        }

    def _build_result(self, text: str, pages: int) -> Dict:
        cleaned = self._clean_text(text)
        return {
            "chunks": self._split_text(cleaned),
            "pages": pages,
            "chars": len(cleaned),
            "text": cleaned,
        }

    def _extract_pdf(self, file_path: Path):
        text_parts: List[str] = []
        with open(file_path, "rb") as f:
            pdf_reader = PyPDF2.PdfReader(f)
            pages = len(pdf_reader.pages)
            for page in pdf_reader.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
        return "\n\n".join(t for t in text_parts if t), pages

    def _extract_docx(self, file_path: Path):
        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n\n".join(paragraphs)
        words = len(text.split())
        pages = max(1, words // 500)
        return text, pages

    def _extract_txt(self, file_path: Path):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        words = len(text.split())
        pages = max(1, words // 500)
        return text, pages

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"[^\w\s\.\,\!\?\;\:\-\(\)\[\]\"\']", " ", text)
        return text.strip()

    def _split_text(self, text: str) -> List[Dict]:
        chunks: List[Dict] = []
        chunk_size = self.config.CHUNK_SIZE
        overlap = self.config.CHUNK_OVERLAP

        words = text.split()
        current_chunk: List[str] = []
        current_length = 0
        chunk_index = 0
        total_chars = 0

        for word in words:
            word_length = len(word) + 1
            if current_length + word_length > chunk_size and current_chunk:
                chunk_text = " ".join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": total_chars,
                })
                total_chars += len(chunk_text) + 1
                chunk_index += 1
                overlap_words = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_words + [word]
                current_length = sum(len(w) + 1 for w in current_chunk)
            else:
                current_chunk.append(word)
                current_length += word_length

        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "chunk_index": chunk_index,
                "start_char": total_chars,
            })

        return chunks
