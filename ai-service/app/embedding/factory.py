"""Factory chọn embedding provider theo cấu hình."""

from functools import lru_cache

from app.core.config import get_settings
from app.embedding.base import EmbeddingProvider


class MockEmbeddingProvider(EmbeddingProvider):
    """Embedding giả cho unit test — vector cố định theo độ dài văn bản."""

    def __init__(self, dim: int = 384) -> None:
        self._dim = dim

    def _vec(self, text: str) -> list[float]:
        seed = (len(text) % 97) / 97.0
        return [seed] * self._dim

    def embed_query(self, text: str) -> list[float]:
        return self._vec(text)

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return [self._vec(t) for t in texts]


@lru_cache
def get_embedder() -> EmbeddingProvider:
    """Embedding provider singleton theo cấu hình."""
    provider = get_settings().embedding_provider.lower()
    if provider == "mock":
        return MockEmbeddingProvider(get_settings().embedding_dim)
    if provider == "e5":
        from app.embedding.e5_provider import E5Provider

        return E5Provider()
    raise ValueError(f"EMBEDDING_PROVIDER '{provider}' không hợp lệ (hỗ trợ: e5, mock)")
