"""Kết nối PostgreSQL (psycopg 3) — dùng chung cho VectorStore và Ingestion.

Pool đơn giản mức demo; mọi truy vấn đi qua hàm get_conn().
"""

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

_pool: ConnectionPool | None = None


def _dsn() -> str:
    s = get_settings()
    return (
        f"host={s.db_host} port={s.db_port} dbname={s.db_name} "
        f"user={s.db_user} password={s.db_password}"
    )


def get_pool() -> ConnectionPool:
    """Khởi tạo pool lười (lazy) — chỉ mở khi thực sự cần DB."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(_dsn(), min_size=1, max_size=5, open=True)
    return _pool


@contextmanager
def get_conn() -> Iterator[psycopg.Connection]:
    """Mượn một connection từ pool (tự trả lại khi ra khỏi with)."""
    with get_pool().connection() as conn:
        yield conn
