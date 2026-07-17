"""Unit test RAG Pipeline với Mock Vector Store + Mock LLM + Mock Embedding."""

import pytest

from app.embedding.factory import MockEmbeddingProvider
from app.llm.mock_adapter import MockLlmAdapter
from app.rag.pipeline import RagPipeline
from app.rag.vector_store import KbChunk, RetrievedChunk, VectorStore


class FakeVectorStore(VectorStore):
    """Vector store giả trả kết quả cài sẵn."""

    def __init__(self, results: list[RetrievedChunk]) -> None:
        self.results = results
        self.last_search: dict | None = None

    def upsert(self, chunks: list[KbChunk]) -> int:
        return len(chunks)

    def search(self, embedding, top_k, source_types=None):
        self.last_search = {"top_k": top_k, "source_types": source_types}
        return self.results

    def delete_source(self, source_type, source_id) -> None:
        pass


def _chunk(score: float, source_type: str = "PROCEDURE") -> RetrievedChunk:
    return RetrievedChunk(
        source_type=source_type,
        source_id="id-1",
        chunk_index=0,
        content="Thủ tục cấp thẻ căn cước: nộp hồ sơ tại công an xã...",
        score=score,
        title="Cấp thẻ căn cước",
    )


@pytest.mark.asyncio
async def test_co_nguon_lien_quan_tra_cau_tra_loi_kem_nguon():
    store = FakeVectorStore([_chunk(0.91), _chunk(0.85, "LEGAL_DOCUMENT")])
    llm = MockLlmAdapter(canned_text="Bạn cần nộp hồ sơ tại công an xã [1].")
    pipeline = RagPipeline(store, MockEmbeddingProvider(), llm)

    result = await pipeline.answer("Làm CCCD ở đâu?", [], "procedure_guide")

    assert "[1]" in result.answer
    assert len(result.sources) == 2
    assert result.confidence == pytest.approx(0.91)
    # Lọc loại nguồn đúng theo intent
    assert store.last_search["source_types"] == ["PROCEDURE", "LEGAL_DOCUMENT"]
    # Context được đưa vào system prompt của LLM
    assert "NGUỒN THAM KHẢO" in llm.calls[0]["system"]


@pytest.mark.asyncio
async def test_khong_co_nguon_du_diem_khong_bia_thong_tin():
    store = FakeVectorStore([_chunk(0.3)])  # dưới ngưỡng rag_min_score
    llm = MockLlmAdapter(canned_text="KHÔNG ĐƯỢC GỌI")
    pipeline = RagPipeline(store, MockEmbeddingProvider(), llm)

    result = await pipeline.answer("Thuế thu nhập cá nhân?", [], "legal_question")

    assert result.sources == []
    assert result.confidence == 0.0
    assert "chưa có đủ thông tin" in result.answer
    assert llm.calls == []  # LLM không được gọi khi không có nguồn -> không bịa
