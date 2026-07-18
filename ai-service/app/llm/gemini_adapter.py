"""Gemini Adapter — cài đặt LlmClient trên Google Gemini API (SDK google-genai).

PROMPT 01 - Tích hợp Google Gemini AI. Đổi provider bằng LLM_PROVIDER=gemini
(xem factory.py); không đổi cách ChatWorkflow/OCR/RagPipeline dùng LLM.
"""

from __future__ import annotations

import base64
import json
import logging
import time
import uuid

from google import genai
from google.genai import errors, types

from app.core.config import get_settings
from app.llm.base import LlmClient, LlmMessage

logger = logging.getLogger("vaic.ai.llm.gemini")


def _map_role(role: str) -> str:
    """Gemini dùng "model" cho vai trò trợ lý, không phải "assistant"."""
    return "model" if role == "assistant" else "user"


def _log_call(
    request_id: str,
    tag: str,
    model: str,
    latency_ms: int,
    status: str,
    usage=None,
    error: str | None = None,
) -> None:
    """Log request_id/model/token/latency/status/error. KHÔNG log nội dung hay API key."""
    logger.info(
        "gemini_call request_id=%s tag=%s model=%s latency_ms=%s status=%s "
        "input_tokens=%s output_tokens=%s error=%s",
        request_id,
        tag,
        model,
        latency_ms,
        status,
        getattr(usage, "prompt_token_count", None) if usage else None,
        getattr(usage, "candidates_token_count", None) if usage else None,
        error,
    )


def _raise_mapped(exc: errors.APIError, request_id: str) -> None:
    """Ánh xạ lỗi Gemini API thành RuntimeError có thông điệp rõ ràng (không lộ key)."""
    code = exc.code
    if code in (401, 403):
        logger.error("gemini_invalid_api_key request_id=%s code=%s", request_id, code)
        raise RuntimeError(
            "GEMINI_API_KEY không hợp lệ hoặc không có quyền truy cập model đã cấu hình."
        ) from exc
    if code == 429:
        logger.error("gemini_rate_limited request_id=%s code=%s", request_id, code)
        raise RuntimeError(
            "Gemini API đã vượt hạn mức (rate limit/quota exceeded). Thử lại sau."
        ) from exc
    if code is not None and 500 <= code < 600:
        logger.error("gemini_server_error request_id=%s code=%s", request_id, code)
        raise RuntimeError("Gemini API gặp lỗi phía server, vui lòng thử lại sau.") from exc
    logger.error(
        "gemini_api_error request_id=%s code=%s message=%s", request_id, code, exc.message
    )
    raise RuntimeError(f"Gemini API trả về lỗi (code={code}).") from exc


class GeminiAdapter(LlmClient):
    """Adapter Google Gemini — cài đúng interface LlmClient (Adapter Pattern)."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY chưa được cấu hình — điền vào ai-service/.env "
                "hoặc chuyển LLM_PROVIDER=mock để chạy không cần key."
            )
        retry_options = types.HttpRetryOptions(
            attempts=settings.gemini_max_retries,
            http_status_codes=[408, 429, 500, 502, 503, 504],
        )
        self._client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(
                timeout=settings.gemini_timeout_ms,
                retry_options=retry_options,
            ),
        )
        self._model = settings.gemini_model
        self._max_tokens = settings.llm_max_tokens
        self._temperature = settings.gemini_temperature
        self._top_p = settings.gemini_top_p
        self._top_k = settings.gemini_top_k

    def _base_config_kwargs(self, max_tokens: int | None = None) -> dict:
        return {
            "max_output_tokens": max_tokens or self._max_tokens,
            "temperature": self._temperature,
            "top_p": self._top_p,
            "top_k": self._top_k,
        }

    async def _generate(
        self, request_id: str, tag: str, contents: list, config: types.GenerateContentConfig
    ):
        """Gọi generate_content, log kết quả, ánh xạ lỗi. Ném RuntimeError khi thất bại."""
        started = time.monotonic()
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model, contents=contents, config=config
            )
        except errors.APIError as exc:
            latency_ms = round((time.monotonic() - started) * 1000)
            _log_call(request_id, tag, self._model, latency_ms, "error", error=str(exc))
            _raise_mapped(exc, request_id)
        except Exception as exc:  # timeout/network/lỗi hạ tầng khác của httpx-aiohttp
            latency_ms = round((time.monotonic() - started) * 1000)
            _log_call(request_id, tag, self._model, latency_ms, "error", error=str(exc))
            logger.error("gemini_network_or_timeout request_id=%s error=%s", request_id, exc)
            raise RuntimeError("Gemini API timeout hoặc lỗi mạng, vui lòng thử lại.") from exc
        latency_ms = round((time.monotonic() - started) * 1000)
        _log_call(request_id, tag, self._model, latency_ms, "ok", usage=response.usage_metadata)
        return response

    async def complete(
        self, system: str, messages: list[LlmMessage], max_tokens: int | None = None
    ) -> str:
        request_id = uuid.uuid4().hex[:8]
        contents = [
            types.Content(role=_map_role(m.role), parts=[types.Part.from_text(text=m.content)])
            for m in messages
        ]
        config = types.GenerateContentConfig(
            **self._base_config_kwargs(max_tokens), system_instruction=system
        )
        response = await self._generate(request_id, "complete", contents, config)
        return response.text or ""

    async def complete_json(
        self, system: str, messages: list[LlmMessage], schema: dict, max_tokens: int | None = None
    ) -> dict:
        request_id = uuid.uuid4().hex[:8]
        contents = [
            types.Content(role=_map_role(m.role), parts=[types.Part.from_text(text=m.content)])
            for m in messages
        ]
        config = types.GenerateContentConfig(
            **self._base_config_kwargs(max_tokens),
            system_instruction=system,
            response_mime_type="application/json",
            response_json_schema=schema,
        )
        response = await self._generate(request_id, "complete_json", contents, config)
        return json.loads(response.text or "{}")

    async def _extract_structured(
        self, data: bytes, media_type: str, prompt: str, schema: dict, tag: str
    ) -> dict:
        request_id = uuid.uuid4().hex[:8]
        part = types.Part.from_bytes(data=data, mime_type=media_type)
        contents = [
            types.Content(role="user", parts=[part, types.Part.from_text(text=prompt)])
        ]
        config = types.GenerateContentConfig(
            **self._base_config_kwargs(),
            response_mime_type="application/json",
            response_json_schema=schema,
        )
        response = await self._generate(request_id, tag, contents, config)
        return json.loads(response.text or "{}")

    async def vision_extract(
        self, image_b64: str, media_type: str, prompt: str, schema: dict
    ) -> dict:
        image_bytes = base64.b64decode(image_b64)
        return await self._extract_structured(
            image_bytes, media_type, prompt, schema, tag="vision_extract"
        )

    async def document_extract(
        self, file_bytes: bytes, media_type: str, prompt: str, schema: dict
    ) -> dict:
        return await self._extract_structured(
            file_bytes, media_type, prompt, schema, tag="document_extract"
        )

    async def health_check(self) -> dict:
        """Ping metadata model (client.aio.models.get) — không sinh nội dung, không tốn token."""
        started = time.monotonic()
        try:
            await self._client.aio.models.get(model=self._model)
        except Exception as exc:  # noqa: BLE001 - health check không được ném lỗi ra ngoài
            logger.warning("gemini_health_check_failed model=%s error=%s", self._model, exc)
            return {"reachable": False, "latency_ms": None, "model": self._model, "error": str(exc)}
        return {
            "reachable": True,
            "latency_ms": round((time.monotonic() - started) * 1000),
            "model": self._model,
            "error": None,
        }
