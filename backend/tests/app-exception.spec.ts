import { HttpStatus } from '@nestjs/common';
import {
  DEFAULT_ERROR_MESSAGES,
  ERROR_CODE_HTTP_STATUS,
  ErrorCode,
  httpStatusToErrorCode,
} from '../src/common/constants/error-code.constants';
import { AppException } from '../src/common/exceptions/app.exception';

/**
 * Unit test cho hệ thống exception chuẩn hóa.
 * Đảm bảo mapping ErrorCode <-> HTTP Status luôn nhất quán.
 */
describe('AppException', () => {
  it('mọi ErrorCode đều có HTTP status và message mặc định', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_CODE_HTTP_STATUS[code]).toBeDefined();
      expect(DEFAULT_ERROR_MESSAGES[code]).toBeDefined();
    }
  });

  it('dùng message mặc định khi không truyền message', () => {
    const ex = new AppException(ErrorCode.NOT_FOUND);
    expect(ex.message).toBe(DEFAULT_ERROR_MESSAGES[ErrorCode.NOT_FOUND]);
    expect(ex.httpStatus).toBe(HttpStatus.NOT_FOUND);
  });

  it('giữ message và details tùy chỉnh', () => {
    const details = [{ field: 'email', errors: ['email không hợp lệ'] }];
    const ex = AppException.validation('Dữ liệu sai', details);
    expect(ex.message).toBe('Dữ liệu sai');
    expect(ex.details).toBe(details);
    expect(ex.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(ex).toBeInstanceOf(AppException);
    expect(ex).toBeInstanceOf(Error);
  });

  it('các factory method trả về đúng errorCode', () => {
    expect(AppException.unauthorized().errorCode).toBe(ErrorCode.UNAUTHORIZED);
    expect(AppException.forbidden().errorCode).toBe(ErrorCode.FORBIDDEN);
    expect(AppException.notFound().errorCode).toBe(ErrorCode.NOT_FOUND);
    expect(AppException.internal().errorCode).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('httpStatusToErrorCode ánh xạ ngược chính xác', () => {
    expect(httpStatusToErrorCode(HttpStatus.NOT_FOUND)).toBe(ErrorCode.NOT_FOUND);
    expect(httpStatusToErrorCode(HttpStatus.UNAUTHORIZED)).toBe(ErrorCode.UNAUTHORIZED);
    // Status không xác định -> quy về INTERNAL_ERROR
    expect(httpStatusToErrorCode(418)).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
