"""Pydantic schemas của API AI Service — hợp đồng vào/ra chuẩn hóa."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Một lượt trong lịch sử hội thoại do caller gửi kèm."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=10000)


class ChatRequest(BaseModel):
    """POST /ai/chat"""

    message: str = Field(min_length=1, max_length=10000, description="Câu hỏi của người dân")
    history: list[ChatMessage] = Field(default_factory=list, description="Lịch sử hội thoại")


class VoiceRequest(BaseModel):
    """POST /ai/voice — nhận transcript từ STT trình duyệt (Web Speech API)."""

    transcript: str = Field(min_length=1, max_length=10000)
    history: list[ChatMessage] = Field(default_factory=list)


class DocumentRequest(BaseModel):
    """POST /ai/document — ảnh giấy tờ base64."""

    imageBase64: str = Field(min_length=100, description="Ảnh mã hóa base64 (không kèm data URI)")
    mediaType: str = Field(default="image/jpeg", description="image/jpeg | image/png | image/webp")


class SearchRequest(BaseModel):
    """POST /ai/search — tìm kiếm ngữ nghĩa trực tiếp trên kho tri thức."""

    query: str = Field(min_length=1, max_length=1000)
    topK: int = Field(default=5, ge=1, le=20)
    sourceTypes: list[Literal["LEGAL_DOCUMENT", "PROCEDURE", "AGENCY"]] | None = None


class SourceItem(BaseModel):
    """Một nguồn trích dẫn trong câu trả lời."""

    sourceType: str
    sourceId: str
    title: str
    excerpt: str
    score: float


class IntentInfo(BaseModel):
    """Kết quả nhận diện ý định."""

    intent: str
    confidence: float
    category: str


class RelatedItem(BaseModel):
    """Đối tượng liên quan (thủ tục/văn bản/cơ quan)."""

    id: str
    title: str


class AiResponse(BaseModel):
    """Response Format chuẩn (NHIỆM VỤ 10)."""

    answer: str
    sources: list[SourceItem]
    confidence: float
    intent: IntentInfo
    relatedProcedures: list[RelatedItem]
    relatedLaws: list[RelatedItem]
    agencies: list[RelatedItem]
    suggestedActions: list[str]
    speakable: bool = Field(default=False, description="True nếu client nên đọc to (TTS)")
