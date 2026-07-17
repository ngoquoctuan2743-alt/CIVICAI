"""Embedding interface — thay model/provider bằng cấu hình (EMBEDDING_PROVIDER)."""

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Interface trừu tượng cho mọi embedding provider."""

    @abstractmethod
    def embed_query(self, text: str) -> list[float]:
        """Embedding cho CÂU HỎI (e5 dùng prefix 'query:')."""

    @abstractmethod
    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        """Embedding cho TÀI LIỆU (e5 dùng prefix 'passage:')."""
