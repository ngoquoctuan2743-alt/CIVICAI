/**
 * Repository Pattern — hợp đồng truy cập dữ liệu chuẩn cho mọi entity.
 *
 * Service CHỈ phụ thuộc vào interface này (Dependency Inversion),
 * không phụ thuộc vào công nghệ database cụ thể.
 *
 * TODO(database): khi công nghệ DB được chốt (ở prompt Database),
 * tạo lớp cài đặt cụ thể (vd: PrismaBaseRepository / TypeOrmBaseRepository)
 * extends BaseRepository và triển khai các phương thức.
 */

/** Hợp đồng CRUD tối thiểu cho một entity */
export interface IBaseRepository<TEntity, TId = string> {
  /** Tìm một bản ghi theo id — trả null nếu không tồn tại */
  findById(id: TId): Promise<TEntity | null>;

  /** Lấy danh sách bản ghi (phân trang/filter sẽ mở rộng sau) */
  findAll(): Promise<TEntity[]>;

  /** Tạo bản ghi mới */
  create(data: Partial<TEntity>): Promise<TEntity>;

  /** Cập nhật bản ghi theo id */
  update(id: TId, data: Partial<TEntity>): Promise<TEntity>;

  /** Xóa bản ghi theo id */
  delete(id: TId): Promise<void>;
}

/**
 * Lớp trừu tượng cơ sở — các repository cụ thể sẽ extends lớp này.
 * Chưa có cài đặt vì công nghệ database CHƯA được chốt.
 */
export abstract class BaseRepository<TEntity, TId = string>
  implements IBaseRepository<TEntity, TId>
{
  abstract findById(id: TId): Promise<TEntity | null>;
  abstract findAll(): Promise<TEntity[]>;
  abstract create(data: Partial<TEntity>): Promise<TEntity>;
  abstract update(id: TId, data: Partial<TEntity>): Promise<TEntity>;
  abstract delete(id: TId): Promise<void>;
}
