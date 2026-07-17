"""Integration test (mock) cho ChatWorkflow: Intent -> định tuyến -> Response chuẩn."""

import pytest

from app.embedding.factory import MockEmbeddingProvider
from app.llm.base import LlmMessage
from app.llm.mock_adapter import MockLlmAdapter
from app.rag.pipeline import RagPipeline
from app.rag.vector_store import RetrievedChunk
from app.workflow.chat import ChatWorkflow
from app.workflow.intent import IntentService
from tests.test_rag_pipeline import FakeVectorStore, _chunk


class RoutedMockLlm(MockLlmAdapter):
    """Mock trả intent cài sẵn cho complete_json, văn bản cho complete."""

    def __init__(self, intent: str) -> None:
        super().__init__(canned_text="Câu trả lời từ trợ lý [1].")
        self._intent = intent

    async def complete_json(self, system, messages, schema, max_tokens=None):
        return {"intent": self._intent, "confidence": 0.9, "category": "demo"}


def _workflow(intent: str, results: list[RetrievedChunk]) -> ChatWorkflow:
    llm = RoutedMockLlm(intent)
    return ChatWorkflow(
        llm=llm,
        intent_service=IntentService(llm),
        rag=RagPipeline(FakeVectorStore(results), MockEmbeddingProvider(), llm),
    )


@pytest.mark.asyncio
async def test_intent_thu_tuc_di_qua_rag_va_tra_response_chuan():
    wf = _workflow("procedure_guide", [_chunk(0.9)])
    result = await wf.handle("Làm thẻ căn cước thế nào?", [])

    # Response Format đủ trường (NHIỆM VỤ 10)
    for key in (
        "answer", "sources", "confidence", "intent",
        "relatedProcedures", "relatedLaws", "agencies", "suggestedActions",
    ):
        assert key in result
    assert result["intent"]["intent"] == "procedure_guide"
    assert result["sources"][0]["title"] == "Cấp thẻ căn cước"
    assert result["relatedProcedures"] == [{"id": "id-1", "title": "Cấp thẻ căn cước"}]
    assert result["suggestedActions"]  # có gợi ý hành động


@pytest.mark.asyncio
async def test_chat_thuong_khong_dung_rag():
    wf = _workflow("general_chat", [_chunk(0.9)])
    result = await wf.handle("Xin chào!", [LlmMessage("user", "hi"), LlmMessage("assistant", "chào")])

    assert result["sources"] == []
    assert result["relatedProcedures"] == []
    assert result["intent"]["intent"] == "general_chat"
