"""Entry point của VAIC AI Service (FastAPI) — PHASE 3: AI Engine hoàn chỉnh.

Chạy dev:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import logging

from fastapi import FastAPI

from app.api.routes import router as ai_router
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("vaic.ai")

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI Engine của VAIC 2026: Chat + Intent + RAG (pgvector) + "
        "Document Understanding (vision) + Voice (transcript)."
    ),
)

app.include_router(ai_router)


@app.get("/health", tags=["system"], summary="Liveness check")
async def health() -> dict:
    """Trạng thái sống của AI service — dùng cho monitoring/gateway."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "llmProvider": settings.llm_provider,
        "embeddingModel": settings.embedding_model,
    }


@app.on_event("startup")
async def on_startup() -> None:
    """Log cấu hình khi khởi động; cảnh báo thiếu API key."""
    logger.info(
        "%s v%s | LLM=%s | embedding=%s",
        settings.app_name,
        settings.app_version,
        settings.llm_provider,
        settings.embedding_model,
    )
    if settings.llm_provider == "claude" and not settings.anthropic_api_key:
        logger.warning(
            "ANTHROPIC_API_KEY chua cau hinh — /ai/chat, /ai/voice, /ai/document se tra 503. "
            "Dien key vao ai-service/.env hoac dat LLM_PROVIDER=mock de demo khong can key."
        )
    if settings.llm_provider == "gemini" and not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY chua cau hinh — /ai/chat, /ai/voice, /ai/document, /ai/health "
            "se tra 503. Dien key vao ai-service/.env hoac dat LLM_PROVIDER=mock de demo khong can key."
        )
