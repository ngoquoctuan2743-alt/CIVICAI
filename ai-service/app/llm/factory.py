"""Factory chọn LLM provider theo cấu hình (env LLM_PROVIDER).

Thêm provider mới: viết adapter triển khai LlmClient -> đăng ký vào _REGISTRY.
"""

from functools import lru_cache
from typing import Callable

from app.core.config import get_settings
from app.llm.base import LlmClient, NotImplementedAdapter
from app.llm.mock_adapter import MockLlmAdapter


def _claude() -> LlmClient:
    from app.llm.claude_adapter import ClaudeAdapter

    return ClaudeAdapter()


_REGISTRY: dict[str, Callable[[], LlmClient]] = {
    "claude": _claude,
    "mock": MockLlmAdapter,
    # Các provider dưới đây đã đăng ký chỗ nhưng CHƯA có adapter (mở rộng sau)
    "openai": lambda: NotImplementedAdapter("openai"),
    "gemini": lambda: NotImplementedAdapter("gemini"),
    "local": lambda: NotImplementedAdapter("local"),
}


@lru_cache
def get_llm() -> LlmClient:
    """LLM client singleton theo cấu hình hiện tại."""
    provider = get_settings().llm_provider.lower()
    if provider not in _REGISTRY:
        raise ValueError(
            f"LLM_PROVIDER '{provider}' không hợp lệ. Hỗ trợ: {', '.join(_REGISTRY)}"
        )
    return _REGISTRY[provider]()
