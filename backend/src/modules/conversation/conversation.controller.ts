import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ConversationService } from './conversation.service';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RenameConversationDto } from './dto/rename-conversation.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/** API hội thoại của người dùng đang đăng nhập */
@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phiên hội thoại mới' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lịch sử hội thoại của tôi (phân trang, tìm theo tiêu đề)' })
  findMine(@CurrentUser() user: AuthUser, @Query() query: ConversationQueryDto) {
    return this.conversationService.findMine(user.userId, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Đổi tên hội thoại' })
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameConversationDto,
  ) {
    return this.conversationService.rename(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hội thoại' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.conversationService.remove(user.userId, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Danh sách tin nhắn của một hội thoại' })
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.conversationService.getMessages(user.userId, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn — AI trả lời (RAG/Intent) và lưu lại' })
  addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.addMessage(user.userId, id, dto);
  }

  @Post(':id/messages/:messageId/feedback')
  @ApiOperation({ summary: 'Đánh giá câu trả lời của AI (👍 = 1, 👎 = -1)' })
  submitFeedback(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.conversationService.submitFeedback(user.userId, id, messageId, dto);
  }
}
