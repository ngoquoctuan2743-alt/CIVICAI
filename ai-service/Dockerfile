# ==================================================
# VAIC 2026 AI Service - Dockerfile (PHASE 3)
# Model embedding được tải sẵn vào image để chạy offline.
# ==================================================
FROM python:3.11-slim

WORKDIR /app

# Cache model Hugging Face trong image
ENV HF_HOME=/opt/hf

# Cài dependencies trước để tận dụng layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tải sẵn embedding model (~470MB) — build một lần, chạy không cần mạng
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

COPY app/ ./app/
COPY tests/ ./tests/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
