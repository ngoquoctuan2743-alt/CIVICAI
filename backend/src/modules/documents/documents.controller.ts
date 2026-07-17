import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DocumentsService } from './documents.service';

/** API OCR / Document Understanding (PHASE 4, dùng bảng `documents` có sẵn từ PHASE 1) */
@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('analyze')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload ảnh giấy tờ -> OCR + AI phân tích -> JSON có cấu trúc' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  analyze(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.documentsService.analyze(user.userId, file);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Lịch sử OCR của tôi' })
  findMine(@CurrentUser() user: AuthUser) {
    return this.documentsService.findMine(user.userId);
  }
}
