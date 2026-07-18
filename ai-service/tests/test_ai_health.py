"""Test GET /ai/health (PROMPT 01) — không gọi provider LLM thật.

Thay get_llm()/get_settings() trong app.api.routes bằng adapter giả (MockLlmAdapter,
NotImplementedAdapter) để test hành vi route độc lập với provider đang cấu hình.
"""

from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.llm.base import NotImplementedAdapter
from app.llm.mock_adapter import MockLlmAdapter
from app.main import app


def test_ai_health_reachable(monkeypatch):
    monkeypatch.setattr("app.api.routes.get_llm", lambda: MockLlmAdapter())
    monkeypatch.setattr("app.api.routes.get_settings", lambda: SimpleNamespace(llm_provider="mock"))

    with TestClient(app) as client:
        resp = client.get("/ai/health")

    assert resp.status_code == 200
    assert resp.json() == {
        "provider": "mock",
        "reachable": True,
        "latency_ms": 0,
        "model": "mock",
        "error": None,
    }


def test_ai_health_provider_not_implemented_returns_501(monkeypatch):
    monkeypatch.setattr("app.api.routes.get_llm", lambda: NotImplementedAdapter("openai"))
    monkeypatch.setattr("app.api.routes.get_settings", lambda: SimpleNamespace(llm_provider="openai"))

    with TestClient(app) as client:
        resp = client.get("/ai/health")

    assert resp.status_code == 501


def test_ai_health_missing_api_key_returns_200_with_reachable_false(monkeypatch):
    """GeminiAdapter/ClaudeAdapter ném RuntimeError ngay khi thiếu key — route không được 500."""

    def _raise_missing_key():
        raise RuntimeError("GEMINI_API_KEY chưa được cấu hình")

    monkeypatch.setattr("app.api.routes.get_llm", _raise_missing_key)
    monkeypatch.setattr("app.api.routes.get_settings", lambda: SimpleNamespace(llm_provider="gemini"))

    with TestClient(app) as client:
        resp = client.get("/ai/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "gemini"
    assert body["reachable"] is False
    assert "GEMINI_API_KEY" in body["error"]
