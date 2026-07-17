/**
 * Types khớp response Backend đã đóng băng (Phase 2-4).
 * KHÔNG tự ý đổi field — đồng bộ với backend/src/common/interfaces & entities.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { requestId: string; timestamp: string; path: string };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string; timestamp: string; path: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Auth ----------
export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
}

export interface AuthResult {
  user: SafeUser;
  tokens: TokenPair;
}

// ---------- Citizen ----------
export interface CitizenProfile {
  id: string;
  userId: string;
  nationalId: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  provinceId: string | null;
  wardId: string | null;
  addressDetail: string | null;
  province?: AdministrativeUnit | null;
  ward?: AdministrativeUnit | null;
}

export interface AdministrativeUnit {
  id: string;
  code: string;
  name: string;
  type: 'PROVINCE' | 'WARD';
}

// ---------- Government ----------
export interface GovernmentAgency {
  id: string;
  code: string;
  name: string;
  level: 'CENTRAL' | 'PROVINCE' | 'WARD';
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  parent?: GovernmentAgency | null;
  adminUnit?: AdministrativeUnit | null;
}

// ---------- Legal ----------
export interface LegalDocument {
  id: string;
  code: string;
  title: string;
  docType: 'LUAT' | 'NGHI_DINH' | 'THONG_TU' | 'QUYET_DINH' | 'KHAC';
  issuingBody: string;
  issuedDate: string | null;
  effectiveDate: string | null;
  status: 'CON_HIEU_LUC' | 'HET_HIEU_LUC' | 'CHUA_HIEU_LUC';
  sourceUrl: string | null;
  summary: string | null;
}

// ---------- Procedures ----------
export interface ProcedureStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string | null;
}

export interface ProcedureRequirement {
  id: string;
  name: string;
  requirementType: 'DOCUMENT' | 'CONDITION';
  quantity: number;
  note: string | null;
  sortOrder: number;
}

export interface AdministrativeProcedure {
  id: string;
  code: string;
  name: string;
  description: string | null;
  onlineLevel: string | null;
  feeText: string | null;
  processingTimeText: string | null;
  legalBasisText: string | null;
  status: string;
  agency?: GovernmentAgency | null;
  steps?: ProcedureStep[];
  requirements?: ProcedureRequirement[];
}

// ---------- Conversation / Chat ----------
export type ConversationChannel = 'CHAT' | 'VOICE';

export interface Conversation {
  id: string;
  title: string | null;
  channel: ConversationChannel;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageSenderRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type MessageContentType = 'TEXT' | 'AUDIO' | 'IMAGE';

export interface AiSourceItem {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface AiRelatedItem {
  id: string;
  title: string;
}

export interface MessageMetadata {
  sources?: AiSourceItem[];
  confidence?: number;
  intent?: { intent: string; confidence: number; category: string };
  relatedProcedures?: AiRelatedItem[];
  relatedLaws?: AiRelatedItem[];
  agencies?: AiRelatedItem[];
  suggestedActions?: string[];
  speakable?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: MessageSenderRole;
  content: string;
  contentType: MessageContentType;
  documentId: string | null;
  metadata: MessageMetadata | null;
  createdAt: string;
}

export interface SendMessageResult {
  userMessage: Message;
  assistantMessage: Message | null;
  aiError: string | null;
}

export interface Feedback {
  id: string;
  messageId: string;
  userId: string;
  rating: 1 | -1;
  comment: string | null;
}

// ---------- Documents / OCR ----------
export interface OcrAnalyzeResult {
  documentId: string;
  docType: string;
  fields: Record<string, string>;
  rawText: string;
  confidence: number;
  suggestedActions: string[];
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  mimeType: string;
  ocrStatus: 'NONE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedText: string | null;
  extractedData: Record<string, unknown> | null;
  ocrError: string | null;
  createdAt: string;
}
