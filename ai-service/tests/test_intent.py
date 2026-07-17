"""Unit test Intent Detection với Mock LLM."""

import pytest

from app.llm.mock_adapter import MockLlmAdapter
from app.workflow.intent import IntentService


@pytest.mark.asyncio
async def test_intent_tra_dung_ket_qua_tu_llm():
    llm = MockLlmAdapter(
        canned_json={"intent": "procedure_guide", "confidence": 0.93, "category": "căn cước"}
    )
    result = await IntentService(llm).detect("Làm thẻ căn cước cần giấy tờ gì?")

    assert result.intent == "procedure_guide"
    assert result.confidence == pytest.approx(0.93)
    assert result.category == "căn cước"
    # LLM được gọi đúng chế độ structured output
    assert llm.calls[0]["type"] == "complete_json"


@pytest.mark.asyncio
async def test_intent_loi_llm_fallback_general_chat():
    class BrokenLlm(MockLlmAdapter):
        async def complete_json(self, *args, **kwargs):
            raise RuntimeError("LLM sập")

    result = await IntentService(BrokenLlm()).detect("xin chào")
    assert result.intent == "general_chat"
    assert result.confidence == 0.0
