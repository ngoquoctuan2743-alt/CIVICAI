/**
 * Enum cấp database của VAIC 2026 — nguồn chân lý duy nhất cho giá trị enum.
 * Migration sẽ tạo PostgreSQL enum type tương ứng.
 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/** Đơn vị hành chính 2 cấp (sau cải cách 01/07/2025 — không còn cấp huyện) */
export enum AdminUnitType {
  PROVINCE = 'PROVINCE',
  WARD = 'WARD',
}

/** Cấp cơ quan nhà nước */
export enum AgencyLevel {
  CENTRAL = 'CENTRAL',
  PROVINCE = 'PROVINCE',
  WARD = 'WARD',
}

/** Loại văn bản pháp luật */
export enum LegalDocType {
  LUAT = 'LUAT',
  NGHI_DINH = 'NGHI_DINH',
  THONG_TU = 'THONG_TU',
  QUYET_DINH = 'QUYET_DINH',
  KHAC = 'KHAC',
}

/** Hiệu lực văn bản pháp luật */
export enum LegalDocStatus {
  CON_HIEU_LUC = 'CON_HIEU_LUC',
  HET_HIEU_LUC = 'HET_HIEU_LUC',
  CHUA_HIEU_LUC = 'CHUA_HIEU_LUC',
}

/** Mức độ dịch vụ công trực tuyến */
export enum OnlineLevel {
  MUC_2 = 'MUC_2',
  MUC_3 = 'MUC_3',
  MUC_4 = 'MUC_4',
}

export enum ProcedureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** Loại yêu cầu của thủ tục: giấy tờ phải nộp hoặc điều kiện phải đáp ứng */
export enum RequirementType {
  DOCUMENT = 'DOCUMENT',
  CONDITION = 'CONDITION',
}

export enum ConversationChannel {
  CHAT = 'CHAT',
  VOICE = 'VOICE',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum MessageSenderRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum MessageContentType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
}

/** Mục đích của file người dùng tải lên */
export enum DocumentPurpose {
  CHAT_ATTACHMENT = 'CHAT_ATTACHMENT',
  OCR_INPUT = 'OCR_INPUT',
  KB_SOURCE = 'KB_SOURCE',
  AVATAR = 'AVATAR',
}

/** Trạng thái xử lý OCR của một document */
export enum OcrStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** Nguồn của một chunk tri thức RAG */
export enum KbSourceType {
  LEGAL_DOCUMENT = 'LEGAL_DOCUMENT',
  PROCEDURE = 'PROCEDURE',
  AGENCY = 'AGENCY',
}

/** Phân loại tài liệu trong kho tri thức RAG (Document Ingestion Pipeline) */
export enum KnowledgeDocumentCategory {
  LEGAL_DOCUMENT = 'LEGAL_DOCUMENT',
  PROCEDURE = 'PROCEDURE',
  FAQ = 'FAQ',
  CIRCULAR = 'CIRCULAR',
  DECREE = 'DECREE',
  FORM = 'FORM',
  AGENCY_INFO = 'AGENCY_INFO',
  OTHER = 'OTHER',
}

/**
 * Trạng thái xử lý của MỘT phiên bản tài liệu (không phải trạng thái của
 * document logic — 1 document có thể có nhiều version, mỗi version tự có
 * vòng đời riêng). "DELETED" không có trong enum này — document bị xóa dùng
 * soft-delete có sẵn từ AuditableEntity (deletedAt), không cần trạng thái riêng.
 */
export enum KnowledgeDocumentVersionStatus {
  NEW = 'NEW',
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  REINDEX_REQUIRED = 'REINDEX_REQUIRED',
}

/** Trạng thái 1 job xử lý parsing & chunking (Prompt 03) */
export enum ChunkProcessingStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
}

/** Mức độ log của 1 dòng ParsingLog */
export enum ParsingLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/** Nguồn dữ liệu huấn luyện/cải thiện AI */
export enum TrainingDataSource {
  FEEDBACK = 'FEEDBACK',
  CONVERSATION = 'CONVERSATION',
  MANUAL = 'MANUAL',
}

export enum TrainingDataStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
