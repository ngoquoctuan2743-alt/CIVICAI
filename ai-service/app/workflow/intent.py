"""Intent Detection (NHIỆM VỤ 3) — phân loại ý định bằng LLM structured output."""

import logging
from dataclasses import dataclass

from app.llm.base import LlmClient, LlmMessage
from app.prompt.templates import INTENT_SCHEMA, INTENT_SYSTEM_PROMPT

logger = logging.getLogger("vaic.ai.intent")


@dataclass
class IntentResult:
    """Kết quả nhận diện ý định."""

    intent: str
    confidence: float
    category: str


class IntentService:
    """Nhận diện intent từ câu nói của người dân."""

    def __init__(self, llm: LlmClient) -> None:
        self._llm = llm

    async def detect(self, message: str) -> IntentResult:
        try:
            raw = await self._llm.complete_json(
                INTENT_SYSTEM_PROMPT,
                [LlmMessage("user", message)],
                INTENT_SCHEMA,
                max_tokens=256,
            )
            return IntentResult(
                intent=str(raw.get("intent", "general_chat")),
                confidence=float(raw.get("confidence", 0.0)),
                category=str(raw.get("category", "")),
            )
        except Exception:
            # Intent hỏng không được làm gãy chat — fallback về chat thường
            logger.warning("Intent detection loi, fallback general_chat", exc_info=True)
            return IntentResult(intent="general_chat", confidence=0.0, category="")
