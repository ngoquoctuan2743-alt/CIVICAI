"""Claude Adapter — cài đặt LlmClient trên Claude API (Anthropic SDK).

Model: claude-opus-4-8 (đã chốt). Structured output qua output_config.format.
"""

import logging
import time

from anthropic import AsyncAnthropic

from app.core.config import get_settings
from app.llm.base import LlmClient, LlmMessage

logger = logging.getLogger("vaic.ai.llm.claude")


def _log_usage(tag: str, usage) -> None:
    """Log token usage nội bộ (Observability - PHASE 4). KHÔNG đưa vào AiResponse
    trả về client — response format của AI Architecture đã đóng băng ở PHASE 3."""
    if usage is not None:
        logger.info(
            "token_usage tag=%s input=%s output=%s",
            tag,
            getattr(usage, "input_tokens", None),
            getattr(usage, "output_tokens", None),
        )


class ClaudeAdapter(LlmClient):
    """Adapter Claude API — chat, JSON có schema và đọc ảnh (vision)."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY chưa được cấu hình — điền vào ai-service/.env "
                "hoặc chuyển LLM_PROVIDER=mock để chạy không cần key."
            )
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.claude_model
        self._max_tokens = settings.llm_max_tokens

    async def complete(
        self, system: str, messages: list[LlmMessage], max_tokens: int | None = None
    ) -> str:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens or self._max_tokens,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        _log_usage("complete", response.usage)
        if response.stop_reason == "refusal":
            logger.warning("Claude tu choi tra loi (stop_reason=refusal)")
            return "Xin lỗi, tôi không thể hỗ trợ nội dung này."
        return next((b.text for b in response.content if b.type == "text"), "")

    async def complete_json(
        self, system: str, messages: list[LlmMessage], schema: dict, max_tokens: int | None = None
    ) -> dict:
        import json

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens or self._max_tokens,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
        _log_usage("complete_json", response.usage)
        text = next((b.text for b in response.content if b.type == "text"), "{}")
        return json.loads(text)

    async def vision_extract(
        self, image_b64: str, media_type: str, prompt: str, schema: dict
    ) -> dict:
        import json

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
        _log_usage("vision_extract", response.usage)
        if response.stop_reason == "refusal":
            return {"error": "Ảnh không thể xử lý"}
        text = next((b.text for b in response.content if b.type == "text"), "{}")
        return json.loads(text)

    async def document_extract(
        self, file_bytes: bytes, media_type: str, prompt: str, schema: dict
    ) -> dict:
        """Claude adapter chưa hỗ trợ đọc PDF trực tiếp (ngoài phạm vi PHASE 3).

        Dùng vision_extract cho ảnh, hoặc chuyển LLM_PROVIDER=gemini để đọc PDF.
        """
        raise NotImplementedError(
            "ClaudeAdapter chưa triển khai document_extract (PDF). "
            "Dùng vision_extract cho ảnh, hoặc đặt LLM_PROVIDER=gemini để đọc PDF trực tiếp."
        )

    async def health_check(self) -> dict:
        """Ping metadata model (không sinh nội dung, không tốn token)."""
        started = time.monotonic()
        try:
            await self._client.models.retrieve(self._model)
        except Exception as exc:  # noqa: BLE001 - health check không được ném lỗi ra ngoài
            logger.warning("claude_health_check_failed model=%s error=%s", self._model, exc)
            return {"reachable": False, "latency_ms": None, "model": self._model, "error": str(exc)}
        return {
            "reachable": True,
            "latency_ms": round((time.monotonic() - started) * 1000),
            "model": self._model,
            "error": None,
        }
