import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminService } from './admin.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';

/** API tổng quan Dashboard Admin — chỉ ADMIN */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '[ADMIN] Số liệu tổng quan hệ thống' })
  getDashboard() {
    return this.adminService.getDashboardSummary();
  }

  @Get('feedback')
  @ApiOperation({ summary: '[ADMIN] Danh sách feedback (kèm ngữ cảnh)' })
  getFeedback(@Query() query: FeedbackQueryDto) {
    return this.adminService.getFeedbackList(query);
  }

  @Get('feedback/stats')
  @ApiOperation({ summary: '[ADMIN] Thống kê feedback' })
  getFeedbackStats() {
    return this.adminService.getFeedbackStats();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '[ADMIN] Nhật ký hoạt động hệ thống' })
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }
}
