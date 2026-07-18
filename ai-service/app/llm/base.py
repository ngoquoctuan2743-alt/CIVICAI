"""LLM Connector — Adapter Pattern (NHIỆM VỤ 1).

LlmClient là interface duy nhất mà phần còn lại của hệ thống được phép dùng.
Đổi nhà cung cấp = viết adapter mới + đổi env LLM_PROVIDER (xem factory.py).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LlmMessage:
    """Một lượt hội thoại gửi vào LLM."""

    role: str  # "user" | "assistant"
    content: str


class LlmClient(ABC):
    """Interface trừu tượng cho mọi LLM provider."""

    @abstractmethod
    async def complete(
        self, system: str, messages: list[LlmMessage], max_tokens: int | None = None
    ) -> str:
        """Sinh câu trả lời văn bản tự do."""

    @abstractmethod
    async def complete_json(
        self, system: str, messages: list[LlmMessage], schema: dict, max_tokens: int | None = None
    ) -> dict:
        """Sinh câu trả lời JSON đúng schema (structured output)."""

    @abstractmethod
    async def vision_extract(
        self, image_b64: str, media_type: str, prompt: str, schema: dict
    ) -> dict:
        """Đọc ảnh (giấy tờ) và trích xuất JSON đúng schema."""

    @abstractmethod
    async def document_extract(
        self, file_bytes: bytes, media_type: str, prompt: str, schema: dict
    ) -> dict:
        """Đọc tài liệu (PDF...) và trích xuất JSON đúng schema (PROMPT 01 - Gemini)."""

    @abstractmethod
    async def health_check(self) -> dict:
        """Kiểm tra kết nối tới provider mà không sinh nội dung (dùng cho GET /ai/health).

        Trả về {"reachable": bool, "latency_ms": int | None, "model": str, "error": str | None}.
        KHÔNG được ném lỗi ra ngoài — mọi lỗi phải được gói vào "error".
        """


class NotImplementedAdapter(LlmClient):
    """Adapter giữ chỗ cho provider chưa triển khai — báo lỗi rõ ràng."""

    def __init__(self, provider: str) -> None:
        self._provider = provider

    def _raise(self) -> None:
        raise NotImplementedError(
            f"LLM provider '{self._provider}' đã đăng ký trong factory nhưng chưa có adapter. "
            "Viết adapter mới triển khai LlmClient rồi đăng ký vào app/llm/factory.py."
        )

    async def complete(self, system, messages, max_tokens=None) -> str:  # noqa: D102
        self._raise()
        return ""

    async def complete_json(self, system, messages, schema, max_tokens=None) -> dict:  # noqa: D102
        self._raise()
        return {}

    async def vision_extract(self, image_b64, media_type, prompt, schema) -> dict:  # noqa: D102
        self._raise()
        return {}

    async def document_extract(self, file_bytes, media_type, prompt, schema) -> dict:  # noqa: D102
        self._raise()
        return {}

    async def health_check(self) -> dict:  # noqa: D102
        self._raise()
        return {}
