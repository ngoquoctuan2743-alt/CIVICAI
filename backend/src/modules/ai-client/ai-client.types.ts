/**
 * Kiểu dữ liệu khớp hợp đồng API của AI Service (đã đóng băng từ PHASE 3).
 * KHÔNG tự ý đổi field — mọi thay đổi phải đồng bộ với ai-service/app/api/schemas.py.
 */

export interface AiChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSourceItem {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface AiIntentInfo {
  intent: string;
  confidence: number;
  category: string;
}

export interface AiRelatedItem {
  id: string;
  title: string;
}

/** Response chuẩn từ /ai/chat và /ai/voice */
export interface AiResponseDto {
  answer: string;
  sources: AiSourceItem[];
  confidence: number;
  intent: AiIntentInfo;
  relatedProcedures: AiRelatedItem[];
  relatedLaws: AiRelatedItem[];
  agencies: AiRelatedItem[];
  suggestedActions: string[];
  speakable: boolean;
}

/** Response từ /ai/document */
export interface AiOcrResultDto {
  docType: string;
  fields: Record<string, string>;
  rawText: string;
  confidence: number;
}

/** Response từ /ai/search */
export interface AiSearchResultDto {
  items: Array<{ sourceType: string; sourceId: string; content: string; score: number }>;
  total: number;
}
