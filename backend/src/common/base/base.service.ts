import { AppLoggerService } from '../../logger/logger.service';

/**
 * Base Service — lớp cha cho mọi service (Service Layer).
 *
 * Trách nhiệm của service (Clean Architecture):
 * - Chứa TOÀN BỘ business logic
 * - Điều phối repository / service khác
 * - Ném AppException khi có lỗi nghiệp vụ (không ném Error thô)
 *
 * Service KHÔNG biết về HTTP (không đụng tới Request/Response).
 */
export abstract class BaseService {
  /** Logger đã gắn sẵn context = tên class con */
  protected readonly logger: AppLoggerService;

  constructor(logger: AppLoggerService) {
    this.logger = logger;
    this.logger.setContext(this.constructor.name);
  }
}
