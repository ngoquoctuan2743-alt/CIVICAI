"""Chat Workflow — bộ điều phối chính: Memory -> Intent -> RAG/Chat -> Response chuẩn.

Response Format (NHIỆM VỤ 10): answer, sources, confidence, intent,
relatedProcedures, relatedLaws, agencies, suggestedActions.
"""

import logging

from app.llm.base import LlmClient, LlmMessage
from app.memory.context import trim_history
from app.prompt.templates import SYSTEM_PROMPT
from app.rag.pipeline import RagPipeline
from app.workflow.intent import IntentService

logger = logging.getLogger("vaic.ai.chat")

# Intent dùng RAG (có kho tri thức hỗ trợ)
RAG_INTENTS = {"legal_question", "procedure_guide", "agency_lookup"}

# Gợi ý hành động tiếp theo tùy intent
SUGGESTED_ACTIONS: dict[str, list[str]] = {
    "legal_question": ["Xem chi tiết văn bản pháp luật liên quan", "Hỏi về thủ tục thực hiện"],
    "procedure_guide": ["Xem danh sách giấy tờ cần chuẩn bị", "Tra cứu cơ quan tiếp nhận hồ sơ"],
    "agency_lookup": ["Xem các thủ tục do cơ quan này xử lý", "Hỏi đường đi/giờ làm việc"],
    "document_ocr": ["Tải ảnh giấy tờ lên để hệ thống đọc tự động"],
    "voice": ["Bấm nút micro để nói chuyện với trợ lý"],
    "general_chat": ["Hỏi về thủ tục hành chính (CCCD, hộ chiếu, khai sinh...)"],
}


class ChatWorkflow:
    """Điều phối một lượt chat hoàn chỉnh."""

    def __init__(self, llm: LlmClient, intent_service: IntentService, rag: RagPipeline) -> None:
        self._llm = llm
        self._intent = intent_service
        self._rag = rag

    async def handle(self, message: str, history: list[LlmMessage]) -> dict:
        """Xử lý 1 tin nhắn; trả về AiResponse dạng dict chuẩn hóa."""
        history = trim_history(history)

        # 1. Nhận diện ý định
        intent = await self._intent.detect(message)
        logger.info("Intent: %s (%.2f) [%s]", intent.intent, intent.confidence, intent.category)

        # 2. Định tuyến
        if intent.intent in RAG_INTENTS:
            rag_result = await self._rag.answer(message, history, intent.intent)
            answer = rag_result.answer
            sources = rag_result.sources
            confidence = rag_result.confidence
        else:
            answer = await self._llm.complete(SYSTEM_PROMPT, [*history, LlmMessage("user", message)])
            sources = []
            confidence = intent.confidence

        # 3. Response chuẩn hóa
        related = {"PROCEDURE": [], "LEGAL_DOCUMENT": [], "AGENCY": []}
        seen: set[str] = set()
        for c in sources:
            if c.source_id not in seen:
                seen.add(c.source_id)
                related[c.source_type].append({"id": c.source_id, "title": c.title})

        return {
            "answer": answer,
            "sources": [
                {
                    "sourceType": c.source_type,
                    "sourceId": c.source_id,
                    "title": c.title,
                    "excerpt": c.content[:200],
                    "score": round(c.score, 4),
                }
                for c in sources
            ],
            "confidence": round(confidence, 4),
            "intent": {
                "intent": intent.intent,
                "confidence": round(intent.confidence, 4),
                "category": intent.category,
            },
            "relatedProcedures": related["PROCEDURE"],
            "relatedLaws": related["LEGAL_DOCUMENT"],
            "agencies": related["AGENCY"],
            "suggestedActions": SUGGESTED_ACTIONS.get(intent.intent, []),
        }
