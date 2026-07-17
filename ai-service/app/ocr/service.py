"""OCR Service (NHIỆM VỤ 7) — đọc giấy tờ bằng Claude Vision.

Pipeline: Upload (base64) -> Vision đọc -> Text + JSON có cấu trúc.
Bọc sau interface OcrEngine để thay engine (Tesseract, cloud OCR...) sau này.
"""

from abc import ABC, abstractmethod

from app.llm.base import LlmClient
from app.prompt.templates import OCR_PROMPT, OCR_SCHEMA


class OcrEngine(ABC):
    """Interface engine đọc giấy tờ."""

    @abstractmethod
    async def analyze(self, image_b64: str, media_type: str) -> dict:
        """Trả về {docType, fields{...}, rawText, confidence}."""


class ClaudeVisionOcr(OcrEngine):
    """OCR + Document Understanding bằng khả năng vision của LLM."""

    def __init__(self, llm: LlmClient) -> None:
        self._llm = llm

    async def analyze(self, image_b64: str, media_type: str) -> dict:
        if media_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            raise ValueError(f"mediaType không hỗ trợ: {media_type} (dùng JPEG/PNG/WebP)")
        return await self._llm.vision_extract(image_b64, media_type, OCR_PROMPT, OCR_SCHEMA)
