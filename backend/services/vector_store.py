import chromadb
from chromadb.config import Settings
from typing import List, Dict
from pathlib import Path


class VectorStore:
    """ChromaDB-backed vector store with per-knowledge-base (kb_id) isolation.

    A single collection holds chunks from every knowledge base; every chunk's
    metadata carries a `kb_id`, and every read/delete is filtered by it so KBs
    cannot leak into each other.
    """

    COLLECTION_NAME = "documents"

    def __init__(self, config):
        self.config = config
        self.db_path = Path("chroma_db")
        self.db_path.mkdir(exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(self.db_path),
            settings=Settings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    async def add_chunks(
        self,
        kb_id: str,
        file_id: str,
        filename: str,
        chunks: List[Dict],
        embeddings: List[List[float]],
        file_metadata: Dict,
    ):
        """Insert chunks with their embeddings, tagged with kb_id."""
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Mismatch: {len(chunks)} chunks but {len(embeddings)} embeddings"
            )

        ids = [f"{kb_id}_{file_id}_chunk_{chunk['chunk_index']}" for chunk in chunks]
        texts = [chunk["text"] for chunk in chunks]
        metadatas = []
        for chunk in chunks:
            md = {
                "kb_id": kb_id,
                "file_id": file_id,
                "filename": filename,
                "chunk_index": chunk["chunk_index"],
                **file_metadata,
            }
            if "start_time" in chunk:
                md["start_time"] = float(chunk["start_time"])
            metadatas.append(md)

        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    async def search(
        self,
        kb_id: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict]:
        """Return top_k most-similar chunks from within a single kb_id."""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"kb_id": kb_id},
        )

        documents = []
        ids = results.get("ids") or [[]]
        if ids and ids[0]:
            for i in range(len(ids[0])):
                documents.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if results.get("distances") else None,
                })
        return documents

    async def delete_file(self, kb_id: str, file_id: str) -> bool:
        """Delete all chunks of a file from a KB. Returns False if file not found."""
        results = self.collection.get(where={"$and": [{"kb_id": kb_id}, {"file_id": file_id}]})
        if not results.get("ids"):
            return False
        self.collection.delete(ids=results["ids"])
        return True

    def get_files(self, kb_id: str) -> List[Dict]:
        """List unique files in a knowledge base."""
        data = self.collection.get(where={"kb_id": kb_id})
        files: Dict[str, Dict] = {}
        for metadata in data.get("metadatas") or []:
            file_id = metadata.get("file_id")
            if file_id and file_id not in files:
                files[file_id] = {
                    "file_id": file_id,
                    "filename": metadata.get("filename", "Unknown"),
                    "upload_date": metadata.get("upload_date", ""),
                    "size_mb": metadata.get("size_mb", 0),
                    "pages": metadata.get("pages", 0),
                    "chars": metadata.get("chars", 0),
                }
        return list(files.values())

    def get_stats(self, kb_id: str) -> Dict:
        """Aggregate stats for one KB."""
        files = self.get_files(kb_id)
        return {
            "total_files": len(files),
            "total_size_mb": round(sum(f["size_mb"] for f in files), 2),
            "total_pages": sum(f["pages"] for f in files),
            "total_chars": sum(f["chars"] for f in files),
        }
