"""API của AI Service: /ai/chat, /ai/voice, /ai/document, /ai/search,
/ai/history (proxy backend), /ai/ingest (nạp kho tri thức).
"""

import logging
from functools import lru_cache

import httpx
from fastapi import APIRouter, Header, HTTPException

from app.api.schemas import (
    AiResponse,
    ChatRequest,
    DocumentRequest,
    SearchRequest,
    VoiceRequest,
)
from app.core.config import get_settings
from app.embedding.factory import get_embedder
from app.llm.base import LlmMessage
from app.llm.factory import get_llm
from app.ocr.service import ClaudeVisionOcr
from app.rag.ingestion import ingest_from_database
from app.rag.pipeline import RagPipeline
from app.rag.vector_store import PgVectorStore
from app.workflow.chat import ChatWorkflow
from app.workflow.intent import IntentService

logger = logging.getLogger("vaic.ai.api")
router = APIRouter(prefix="/ai", tags=["ai"])


# ---------- Lắp ráp dependency (singleton, lazy) ----------
@lru_cache
def _store() -> PgVectorStore:
    return PgVectorStore()


@lru_cache
def _workflow() -> ChatWorkflow:
    llm = get_llm()
    return ChatWorkflow(
        llm=llm,
        intent_service=IntentService(llm),
        rag=RagPipeline(_store(), get_embedder(), llm),
    )


def _to_llm_history(history) -> list[LlmMessage]:
    return [LlmMessage(m.role, m.content) for m in history]


# ---------- Endpoints ----------
@router.post("/chat", response_model=AiResponse, summary="Chat với trợ lý (Intent + RAG)")
async def chat(body: ChatRequest) -> AiResponse:
    try:
        result = await _workflow().handle(body.message, _to_llm_history(body.history))
        return AiResponse(**result, speakable=False)
    except RuntimeError as exc:  # thiếu API key...
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/voice", response_model=AiResponse, summary="Chat bằng giọng nói (transcript từ trình duyệt)")
async def voice(body: VoiceRequest) -> AiResponse:
    """STT/TTS chạy ở trình duyệt; server nhận transcript và trả speakable=True."""
    try:
        result = await _workflow().handle(body.transcript, _to_llm_history(body.history))
        return AiResponse(**result, speakable=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/document", summary="Đọc ảnh giấy tờ (OCR + phân tích) -> JSON")
async def document(body: DocumentRequest) -> dict:
    try:
        ocr = ClaudeVisionOcr(get_llm())
        return await ocr.analyze(body.imageBase64, body.mediaType)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/search", summary="Tìm kiếm ngữ nghĩa trên kho tri thức (không qua LLM)")
async def search(body: SearchRequest) -> dict:
    query_vec = get_embedder().embed_query(body.query)
    chunks = _store().search(query_vec, top_k=body.topK, source_types=body.sourceTypes)
    return {
        "items": [
            {
                "sourceType": c.source_type,
                "sourceId": c.source_id,
                "content": c.content,
                "score": round(c.score, 4),
            }
            for c in chunks
        ],
        "total": len(chunks),
    }


@router.get("/history", summary="Lịch sử hội thoại (proxy sang Backend)")
async def history(authorization: str = Header(default="")) -> dict:
    """Lịch sử thuộc sở hữu Backend — endpoint này proxy để giữ đúng hợp đồng API."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Thiếu header Authorization (Bearer token)")
    backend = get_settings().backend_base_url
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{backend}/conversations", headers={"Authorization": authorization}
        )
    return resp.json()


@router.post("/ingest", summary="Nạp/refresh kho tri thức từ database (nội bộ)")
async def ingest() -> dict:
    """Đọc luật/thủ tục/cơ quan từ DB -> chunk -> embed -> kb_chunks.

    LƯU Ý vận hành: endpoint nội bộ, không expose ra ngoài gateway ở production.
    """
    stats = ingest_from_database(_store(), get_embedder())
    return {"status": "ok", **stats}
