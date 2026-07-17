import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception';
import { StorageConfig } from '../../config/configuration';
import { DocumentPurpose, OcrStatus } from '../../database/entities/enums';
import { DocumentEntity } from '../../database/entities/document.entity';
import { AppLoggerService } from '../../logger/logger.service';
import { AiClientService } from '../ai-client/ai-client.service';

/** Danh sách mediaType ảnh được chấp nhận cho OCR (khớp AI Service) */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Gợi ý hành động tiếp theo theo loại giấy tờ nhận diện được */
const SUGGESTED_ACTIONS_BY_DOC_TYPE: Record<string, string[]> = {
  CCCD: ['Xem thủ tục cấp đổi/cấp lại thẻ căn cước', 'Hỏi AI về thủ tục liên quan đến CCCD'],
  GIAY_KHAI_SINH: ['Tra cứu thủ tục hộ tịch liên quan', 'Hỏi AI về đăng ký khai sinh'],
  DON_TU: ['Hỏi AI để được hướng dẫn hoàn thiện đơn từ'],
  BIEU_MAU: ['Hỏi AI để được hướng dẫn điền biểu mẫu'],
  GIAY_TO_KHAC: ['Hỏi AI về loại giấy tờ này'],
};

/**
 * DocumentsService — OCR Workflow (NHIỆM VỤ 3, PHASE 4).
 * Upload -> lưu file local -> gọi AI Service (Claude Vision) -> cập nhật
 * kết quả vào bảng documents đã có sẵn từ PHASE 1 (chưa từng được dùng).
 */
@Injectable()
export class DocumentsService {
  private readonly storage: StorageConfig;

  constructor(
    @InjectRepository(DocumentEntity) private readonly documentRepo: Repository<DocumentEntity>,
    private readonly aiClient: AiClientService,
    configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(DocumentsService.name);
    this.storage = configService.getOrThrow<StorageConfig>('storage');
  }

  async analyze(userId: string, file: Express.Multer.File) {
    this.validateFile(file);

    const storageKey = await this.saveToDisk(file);

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        ownerId: userId,
        storageKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        purpose: DocumentPurpose.OCR_INPUT,
        ocrStatus: OcrStatus.PROCESSING,
        createdBy: userId,
      }),
    );

    try {
      const result = await this.aiClient.analyzeDocument(file.buffer.toString('base64'), file.mimetype);

      document.ocrStatus = OcrStatus.COMPLETED;
      document.extractedText = result.rawText;
      document.extractedData = { docType: result.docType, fields: result.fields, confidence: result.confidence };
      await this.documentRepo.save(document);

      this.logger.log(`OCR thanh cong cho document ${document.id} (docType=${result.docType})`);

      return {
        documentId: document.id,
        docType: result.docType,
        fields: result.fields,
        rawText: result.rawText,
        confidence: result.confidence,
        suggestedActions: SUGGESTED_ACTIONS_BY_DOC_TYPE[result.docType] ?? [],
      };
    } catch (error) {
      // Lưu trạng thái FAILED để có audit trail, rồi ném lỗi chuẩn cho client
      document.ocrStatus = OcrStatus.FAILED;
      document.ocrError = (error as Error).message.slice(0, 500);
      await this.documentRepo.save(document);
      throw error;
    }
  }

  /** Lịch sử OCR của user (dùng cho trang Profile — NHIỆM VỤ 9 Phase 5) */
  async findMine(userId: string) {
    return this.documentRepo.find({
      where: { ownerId: userId, purpose: DocumentPurpose.OCR_INPUT },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private validateFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw AppException.badRequest('Thiếu file để phân tích (field "file")');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw AppException.badRequest(
        `Định dạng ảnh không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > this.storage.maxFileSizeBytes) {
      throw AppException.badRequest(
        `File vượt quá dung lượng tối đa ${Math.round(this.storage.maxFileSizeBytes / 1024 / 1024)}MB`,
      );
    }
  }

  private async saveToDisk(file: Express.Multer.File): Promise<string> {
    await mkdir(join(this.storage.uploadDir, 'documents'), { recursive: true });
    const storageKey = `documents/${randomUUID()}${extname(file.originalname) || '.jpg'}`;
    await writeFile(join(this.storage.uploadDir, storageKey), file.buffer);
    return storageKey;
  }
}
