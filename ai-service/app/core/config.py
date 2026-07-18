"""Configuration Management của AI Service.

Mọi cấu hình đọc từ biến môi trường qua pydantic-settings (fail-fast, có type).
Không đọc os.environ trực tiếp ở nơi khác.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Biến môi trường của AI Service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ---- App ----
    app_name: str = "VAIC AI Service"
    app_version: str = "0.3.0"
    environment: str = "development"

    # ---- LLM (Adapter Pattern - đổi provider bằng cấu hình) ----
    llm_provider: str = "claude"  # claude | gemini | openai | local | mock
    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-4-8"
    llm_max_tokens: int = 2048

    # ---- LLM: Gemini (PROMPT 01 - Tích hợp Gemini) ----
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_timeout_ms: int = 30000
    gemini_max_retries: int = 3
    gemini_temperature: float = 0.7
    gemini_top_p: float = 0.95
    gemini_top_k: int = 40

    # ---- Embedding ----
    embedding_provider: str = "e5"  # e5 | mock
    embedding_model: str = "intfloat/multilingual-e5-small"
    embedding_dim: int = 384

    # ---- RAG ----
    chunk_size: int = 700
    chunk_overlap: int = 100
    rag_top_k: int = 5
    # Ngưỡng điểm cosine tối thiểu để coi là nguồn liên quan
    rag_min_score: float = 0.75

    # ---- Voice ----
    voice_engine: str = "browser"  # browser | whisper (chưa triển khai)

    # ---- Database (PostgreSQL dùng chung với backend) ----
    db_host: str = "localhost"
    db_port: int = 5433
    db_user: str = "vaic"
    db_password: str = "vaic_dev_password"
    db_name: str = "vaic"

    # ---- Backend nội bộ (proxy /ai/history) ----
    backend_base_url: str = "http://localhost:3100/api/v1"


@lru_cache
def get_settings() -> Settings:
    """Trả về Settings singleton (cache)."""
    return Settings()
