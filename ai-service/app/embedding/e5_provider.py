"""E5 Provider — sentence-transformers multilingual-e5-small (384 chiều, local).

Import lười (lazy) vì torch nặng; model được nướng sẵn vào Docker image.
"""

import logging

from app.core.config import get_settings
from app.embedding.base import EmbeddingProvider

logger = logging.getLogger("vaic.ai.embedding")


class E5Provider(EmbeddingProvider):
    """Embedding local bằng intfloat/multilingual-e5-small."""

    def __init__(self) -> None:
        from sentence_transformers import SentenceTransformer  # lazy import (torch nặng)

        settings = get_settings()
        logger.info("Dang nap embedding model %s ...", settings.embedding_model)
        self._model = SentenceTransformer(settings.embedding_model)

    def embed_query(self, text: str) -> list[float]:
        # Chuẩn e5: câu hỏi phải có prefix "query: "
        vec = self._model.encode(f"query: {text}", normalize_embeddings=True)
        return vec.tolist()

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        # Chuẩn e5: tài liệu phải có prefix "passage: "
        vecs = self._model.encode(
            [f"passage: {t}" for t in texts], normalize_embeddings=True, batch_size=16
        )
        return [v.tolist() for v in vecs]
