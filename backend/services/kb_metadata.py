import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional


class KBMetadataStore:
    """Tiny JSON-backed store for knowledge-base metadata (name, created_at).

    Per-chunk metadata lives in Chroma; this file holds only the KB-level
    properties that don't belong on every chunk. Synchronous + thread-safe;
    file is rewritten on every change.
    """

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._data: Dict[str, Dict] = self._load()

    def _load(self) -> Dict[str, Dict]:
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

    def _save(self) -> None:
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(self._data, indent=2), encoding="utf-8")
        tmp.replace(self.path)

    def get(self, kb_id: str) -> Optional[Dict]:
        with self._lock:
            entry = self._data.get(kb_id)
            return dict(entry) if entry else None

    def create(self, kb_id: str, name: str, suggested_questions: Optional[list] = None) -> Dict:
        now = datetime.now().isoformat()
        entry = {
            "kb_id": kb_id,
            "name": name,
            "created_at": now,
            "updated_at": now,
            "suggested_questions": list(suggested_questions or []),
        }
        with self._lock:
            self._data[kb_id] = entry
            self._save()
        return dict(entry)

    def set_name(self, kb_id: str, name: str) -> Optional[Dict]:
        with self._lock:
            entry = self._data.get(kb_id)
            if not entry:
                return None
            entry["name"] = name
            entry["updated_at"] = datetime.now().isoformat()
            self._save()
            return dict(entry)

    def set_suggested_questions(self, kb_id: str, questions: list) -> Optional[Dict]:
        with self._lock:
            entry = self._data.get(kb_id)
            if not entry:
                return None
            entry["suggested_questions"] = list(questions)
            entry["updated_at"] = datetime.now().isoformat()
            self._save()
            return dict(entry)

    def ensure(self, kb_id: str, default_name: str, suggested_questions: Optional[list] = None) -> Dict:
        """Get or create the KB metadata. Used for ids that exist in Chroma but were never registered."""
        with self._lock:
            entry = self._data.get(kb_id)
            if entry:
                # Backfill suggested_questions if missing (older rows).
                if suggested_questions and not entry.get("suggested_questions"):
                    entry["suggested_questions"] = list(suggested_questions)
                    self._save()
                return dict(entry)
            now = datetime.now().isoformat()
            entry = {
                "kb_id": kb_id,
                "name": default_name,
                "created_at": now,
                "updated_at": now,
                "suggested_questions": list(suggested_questions or []),
            }
            self._data[kb_id] = entry
            self._save()
            return dict(entry)
