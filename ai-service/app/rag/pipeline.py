"""RAG Pipeline (NHIỆM VỤ 4): Question -> Embedding -> Vector Search
-> Context Builder -> LLM -> Response kèm nguồn trích dẫn.
"""

import logging
from dataclasses import dataclass

from app.core.config import get_settings
from app.embedding.base import EmbeddingProvider
from app.llm.base import LlmClient, LlmMessage
from app.prompt.templates import build_rag_system_prompt
from app.rag.vector_store import RetrievedChunk, VectorStore

logger = logging.getLogger("vaic.ai.rag")

# Intent -> loại nguồn ưu tiên truy hồi
INTENT_SOURCE_TYPES: dict[str, list[str] | None] = {
    "legal_question": ["LEGAL_DOCUMENT", "PROCEDURE"],
    "procedure_guide": ["PROCEDURE", "LEGAL_DOCUMENT"],
    "agency_lookup": ["AGENCY", "PROCEDURE"],
}


@dataclass
class RagResult:
    """Kết quả pipeline RAG."""

    answer: str
    sources: list[RetrievedChunk]
    confidence: float


class RagPipeline:
    """Pipeline truy hồi + sinh câu trả lời. DI qua constructor để test được."""

    def __init__(self, store: VectorStore, embedder: EmbeddingProvider, llm: LlmClient) -> None:
        self._store = store
        self._embedder = embedder
        self._llm = llm

    async def answer(
        self, question: str, history: list[LlmMessage], intent: str
    ) -> RagResult:
        settings = get_settings()

        # 1. Embedding câu hỏi
        query_vec = self._embedder.embed_query(question)

        # 2. Vector search (lọc loại nguồn theo intent)
        chunks = self._store.search(
            query_vec, top_k=settings.rag_top_k, source_types=INTENT_SOURCE_TYPES.get(intent)
        )
        relevant = [c for c in chunks if c.score >= settings.rag_min_score]

        # 3. Không có nguồn đủ liên quan -> trả lời an toàn, không bịa
        if not relevant:
            return RagResult(
                answer=(
                    "Xin lỗi, tôi chưa có đủ thông tin trong kho tri thức để trả lời chính xác "
                    "câu hỏi này. Bạn có thể liên hệ Trung tâm Phục vụ hành chính công nơi cư trú "
                    "hoặc tổng đài 1022 để được hỗ trợ trực tiếp."
                ),
                sources=[],
                confidence=0.0,
            )

        # 4. Context Builder: ghép nguồn đánh số [1..n]
        self._fill_titles(relevant)
        context_blocks = [f"({c.title}) {c.content}" for c in relevant]
        system = build_rag_system_prompt(context_blocks)

        # 5. LLM sinh câu trả lời có trích dẫn
        answer = await self._llm.complete(system, [*history, LlmMessage("user", question)])

        return RagResult(answer=answer, sources=relevant, confidence=max(c.score for c in relevant))

    def _fill_titles(self, chunks: list[RetrievedChunk]) -> None:
        """Gắn tiêu đề nguồn (tên văn bản/thủ tục/cơ quan) để hiển thị trích dẫn."""
        try:
            from app.core.db import get_conn

            table_by_type = {
                "LEGAL_DOCUMENT": ("legal_documents", "title"),
                "PROCEDURE": ("administrative_procedures", "name"),
                "AGENCY": ("government_agencies", "name"),
            }
            with get_conn() as conn, conn.cursor() as cur:
                for c in chunks:
                    table, col = table_by_type[c.source_type]
                    cur.execute(f"SELECT {col} FROM {table} WHERE id = %s", (c.source_id,))  # noqa: S608 — bảng/cột từ whitelist
                    row = cur.fetchone()
                    c.title = row[0] if row else c.source_type
        except Exception:  # pragma: no cover — thiếu DB (unit test) thì giữ title mặc định
            logger.warning("Khong lay duoc tieu de nguon (bo qua)", exc_info=True)
