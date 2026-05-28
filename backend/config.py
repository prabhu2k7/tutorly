from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    OPENAI_API_KEY: str = ""

    # Deployment
    PORT: int = 8000
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:7860,http://127.0.0.1:7860"
    )
    # Path (relative to CWD) where the built React bundle lives. In the Docker
    # image this is "frontend/dist". Empty string disables static serving.
    FRONTEND_DIST: str = ""

    # Quotas
    MAX_FILE_MB: float = 25.0
    MAX_KB_MB: float = 200.0
    MAX_PAGES: int = 300
    MAX_CHARS: int = 3000000

    # RAG
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    CHAT_MODEL: str = "gpt-4o-mini"
    TOP_K: int = 5

    @property
    def allowed_origins_list(self):
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
