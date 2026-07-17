/**
 * DTO Base — lớp đánh dấu (marker) cho mọi Data Transfer Object.
 *
 * Quy ước DTO của dự án:
 * - Mọi DTO (request/response) đều extends BaseDto.
 * - Dùng decorator của class-validator để khai báo ràng buộc
 *   (ValidationPipe toàn cục sẽ tự validate + strip field lạ).
 * - DTO chỉ chứa dữ liệu + ràng buộc, KHÔNG chứa logic.
 * - Đặt tên: <Hành động><Đối tượng>Dto, vd: CreateUserDto, PaginationQueryDto.
 */
export abstract class BaseDto {}
