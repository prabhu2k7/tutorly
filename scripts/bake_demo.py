"""Extract the demo KB out of a local ChromaDB into demo_seed.json.

Run this ONCE on the developer's laptop (which has the demo KB populated
via the normal startup seed using a real OPENAI_API_KEY). The resulting
backend/demo_seed.json is committed to the repo and shipped in the Docker
image, so the public Hugging Face Space can hydrate the demo at startup
with zero OpenAI cost.

Usage (from repo root):
    python scripts/bake_demo.py
"""
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND))

import os
os.chdir(BACKEND)  # so VectorStore finds chroma_db relative to cwd

from config import Config  # noqa: E402
from services.kb_metadata import KBMetadataStore  # noqa: E402
from services.vector_store import VectorStore  # noqa: E402

DEMO_KB_ID = "demo"
DEMO_NAME = "Linear Algebra — Demo"


def main():
    config = Config()
    vs = VectorStore(config)
    kb_meta = KBMetadataStore(Path("kb_metadata.json"))

    data = vs.collection.get(
        where={"kb_id": DEMO_KB_ID},
        include=["documents", "metadatas", "embeddings"],
    )

    ids = data.get("ids") or []
    if not ids:
        print(
            "ERROR: local Chroma has no chunks under kb_id='demo'. "
            "Start the backend with a valid OPENAI_API_KEY in backend/.env first "
            "(the lifespan auto-seeds the demo on cold start) and rerun this script."
        )
        sys.exit(1)

    docs = data["documents"]
    metas = data["metadatas"]
    embs = data["embeddings"]

    meta_entry = kb_meta.get(DEMO_KB_ID)
    name = (meta_entry or {}).get("name") or DEMO_NAME

    payload = {
        "kb_id": DEMO_KB_ID,
        "name": name,
        "chunks": [
            {
                "id": ids[i],
                "text": docs[i],
                "metadata": metas[i],
                "embedding": list(embs[i]),
            }
            for i in range(len(ids))
        ],
    }

    out_path = BACKEND / "demo_seed.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    size_kb = out_path.stat().st_size / 1024
    print(
        f"Baked {len(payload['chunks'])} chunks ({size_kb:.1f} KB) -> {out_path}"
    )


if __name__ == "__main__":
    main()
