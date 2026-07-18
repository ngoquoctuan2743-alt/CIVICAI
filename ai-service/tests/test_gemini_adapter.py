"""Unit test cho GeminiAdapter (PROMPT 01) — mock hoàn toàn SDK google-genai.

KHÔNG gọi API Gemini thật: genai.Client được thay bằng FakeGenaiClient,
generate_content/models.get là AsyncMock trả dữ liệu giả lập sẵn.
"""

from dataclasses import dataclass
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from google.genai import errors

from app.llm import gemini_adapter as gemini_adapter_module
from app.llm.base import LlmMessage
from app.llm.gemini_adapter import GeminiAdapter


@dataclass
class _FakeSettings:
    """Settings giả — cô lập test khỏi Settings thật/lru_cache/.env."""

    gemini_api_key: str = "fake-key"
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_ms: int = 30000
    gemini_max_retries: int = 3
    gemini_temperature: float = 0.7
    gemini_top_p: float = 0.95
    gemini_top_k: int = 40
    llm_max_tokens: int = 2048


class _FakeAioModels:
    def __init__(self) -> None:
        self.generate_content = AsyncMock()
        self.get = AsyncMock()


class _FakeAio:
    def __init__(self) -> None:
        self.models = _FakeAioModels()


class FakeGenaiClient:
    """Thay genai.Client thật — không mở kết nối mạng nào."""

    def __init__(self, *args, **kwargs) -> None:
        self.aio = _FakeAio()


def _fake_response(text: str, prompt_tokens: int = 10, output_tokens: int = 5):
    return SimpleNamespace(
        text=text,
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt_tokens, candidates_token_count=output_tokens
        ),
    )


def _make_adapter(monkeypatch, settings: _FakeSettings | None = None) -> GeminiAdapter:
    monkeypatch.setattr(gemini_adapter_module, "get_settings", lambda: settings or _FakeSettings())
    monkeypatch.setattr(gemini_adapter_module.genai, "Client", FakeGenaiClient)
    return GeminiAdapter()


# ---------- Config / khởi tạo ----------
def test_missing_api_key_raises_runtime_error(monkeypatch):
    monkeypatch.setattr(
        gemini_adapter_module, "get_settings", lambda: _FakeSettings(gemini_api_key="")
    )
    monkeypatch.setattr(gemini_adapter_module.genai, "Client", FakeGenaiClient)

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        GeminiAdapter()


def test_adapter_uses_configured_model(monkeypatch):
    adapter = _make_adapter(monkeypatch, _FakeSettings(gemini_model="gemini-2.5-pro"))
    assert adapter._model == "gemini-2.5-pro"  # noqa: SLF001 - test nội bộ


# ---------- generateText()/chat() -> complete() ----------
@pytest.mark.asyncio
async def test_complete_returns_text(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.return_value = _fake_response("Xin chào!")

    result = await adapter.complete("system prompt", [LlmMessage("user", "Chào bạn")])

    assert result == "Xin chào!"
    adapter._client.aio.models.generate_content.assert_awaited_once()
    _, kwargs = adapter._client.aio.models.generate_content.call_args
    assert kwargs["model"] == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_complete_multi_turn_history_maps_assistant_to_model_role(monkeypatch):
    """chat() dùng chung complete() với lịch sử hội thoại — assistant phải map sang "model"."""
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.return_value = _fake_response("OK")

    await adapter.complete(
        "system",
        [LlmMessage("user", "câu 1"), LlmMessage("assistant", "trả lời 1"), LlmMessage("user", "câu 2")],
    )

    _, kwargs = adapter._client.aio.models.generate_content.call_args
    roles = [c.role for c in kwargs["contents"]]
    assert roles == ["user", "model", "user"]


@pytest.mark.asyncio
async def test_complete_json_parses_response(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.return_value = _fake_response('{"intent": "chat"}')

    result = await adapter.complete_json("system", [LlmMessage("user", "hi")], schema={"type": "object"})

    assert result == {"intent": "chat"}


# ---------- generateFromImage()/generateFromPDF() ----------
@pytest.mark.asyncio
async def test_vision_extract_decodes_base64_and_returns_json(monkeypatch):
    import base64

    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.return_value = _fake_response(
        '{"docType": "CCCD"}'
    )
    image_b64 = base64.b64encode(b"fake-image-bytes").decode()

    result = await adapter.vision_extract(image_b64, "image/jpeg", "Đọc CCCD", {"type": "object"})

    assert result == {"docType": "CCCD"}


@pytest.mark.asyncio
async def test_document_extract_pdf_returns_json(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.return_value = _fake_response(
        '{"docType": "PDF_FORM"}'
    )

    result = await adapter.document_extract(
        b"%PDF-fake-bytes", "application/pdf", "Đọc form PDF", {"type": "object"}
    )

    assert result == {"docType": "PDF_FORM"}


# ---------- Error handling: timeout / rate limit / invalid key / network / quota ----------
@pytest.mark.asyncio
async def test_invalid_api_key_error_mapped_to_runtime_error(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.side_effect = errors.APIError(
        code=401, response_json={"error": {"message": "invalid api key"}}
    )

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY không hợp lệ"):
        await adapter.complete("system", [LlmMessage("user", "hi")])


@pytest.mark.asyncio
async def test_rate_limit_error_mapped_to_runtime_error(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.side_effect = errors.APIError(
        code=429, response_json={"error": {"message": "quota exceeded"}}
    )

    with pytest.raises(RuntimeError, match="hạn mức"):
        await adapter.complete("system", [LlmMessage("user", "hi")])


@pytest.mark.asyncio
async def test_server_error_mapped_to_runtime_error(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.side_effect = errors.APIError(
        code=503, response_json={"error": {"message": "server overloaded"}}
    )

    with pytest.raises(RuntimeError, match="lỗi phía server"):
        await adapter.complete("system", [LlmMessage("user", "hi")])


@pytest.mark.asyncio
async def test_network_or_timeout_error_mapped_to_runtime_error(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.generate_content.side_effect = TimeoutError("connect timed out")

    with pytest.raises(RuntimeError, match="timeout hoặc lỗi mạng"):
        await adapter.complete("system", [LlmMessage("user", "hi")])


# ---------- healthCheck() ----------
@pytest.mark.asyncio
async def test_health_check_reachable(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.get.return_value = SimpleNamespace(name="gemini-2.5-flash")

    result = await adapter.health_check()

    assert result["reachable"] is True
    assert result["model"] == "gemini-2.5-flash"
    assert isinstance(result["latency_ms"], int)
    assert result["error"] is None


@pytest.mark.asyncio
async def test_health_check_unreachable_does_not_raise(monkeypatch):
    adapter = _make_adapter(monkeypatch)
    adapter._client.aio.models.get.side_effect = errors.APIError(
        code=500, response_json={"error": {"message": "down"}}
    )

    result = await adapter.health_check()

    assert result["reachable"] is False
    assert result["latency_ms"] is None
    assert result["error"] is not None
