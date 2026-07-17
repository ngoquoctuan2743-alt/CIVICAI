"""Voice Assistant (NHIỆM VỤ 8) — thiết kế theo Interface, thay engine bằng cấu hình.

Kiến trúc đã chốt cho demo: STT/TTS chạy Ở TRÌNH DUYỆT (Web Speech API, vi-VN)
-> server chỉ nhận TRANSCRIPT và trả văn bản kèm cờ `speakable` để client đọc.

Nâng cấp server-side (faster-whisper) chỉ cần viết engine mới cùng interface.
"""

from abc import ABC, abstractmethod

from app.core.config import get_settings


class SpeechToText(ABC):
    """Interface STT server-side."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        """Chuyển audio -> văn bản."""


class TextToSpeech(ABC):
    """Interface TTS server-side."""

    @abstractmethod
    async def synthesize(self, text: str) -> bytes:
        """Chuyển văn bản -> audio."""


class BrowserSpeechEngine(SpeechToText, TextToSpeech):
    """Engine 'browser': STT/TTS diễn ra ở client — server không xử lý audio."""

    _MESSAGE = (
        "Engine giọng nói đang cấu hình là 'browser': trình duyệt thực hiện STT/TTS "
        "(Web Speech API), server chỉ nhận transcript qua POST /ai/voice. "
        "Muốn xử lý audio phía server, triển khai engine 'whisper' và đổi VOICE_ENGINE."
    )

    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        raise NotImplementedError(self._MESSAGE)

    async def synthesize(self, text: str) -> bytes:
        raise NotImplementedError(self._MESSAGE)


def get_voice_engine() -> BrowserSpeechEngine:
    """Factory engine giọng nói theo cấu hình VOICE_ENGINE."""
    engine = get_settings().voice_engine.lower()
    if engine == "browser":
        return BrowserSpeechEngine()
    raise ValueError(
        f"VOICE_ENGINE '{engine}' chưa được hỗ trợ (hiện có: browser; whisper là hướng mở rộng)"
    )
