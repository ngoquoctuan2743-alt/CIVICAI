import { AppLoggerService } from '../../logger/logger.service';

/**
 * Base Controller — lớp cha cho mọi controller.
 *
 * Trách nhiệm của controller (Clean Architecture):
 * - Nhận request, validate DTO (qua ValidationPipe toàn cục)
 * - Gọi service tương ứng
 * - Return dữ liệu thô (ResponseInterceptor sẽ bọc thành ApiResponse)
 *
 * Controller KHÔNG chứa business logic, KHÔNG truy cập repository trực tiếp.
 */
export abstract class BaseController {
  /** Logger đã gắn sẵn context = tên class con */
  protected readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger;
    this.logger.setContext(this.constructor.name);
  }
}
