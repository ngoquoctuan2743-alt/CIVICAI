import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Cột chung tối thiểu cho MỌI bảng: UUID PK + timestamps.
 * Dùng cho bảng danh mục/tra cứu (không cần soft delete).
 */
export abstract class BaseDbEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Bảng dữ liệu người dùng/nghiệp vụ: thêm Soft Delete + Audit + Optimistic Lock.
 */
export abstract class AuditableEntity extends BaseDbEntity {
  /** Soft delete — bản ghi bị "xóa" vẫn nằm trong DB */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  /** Optimistic locking — chống ghi đè khi sửa đồng thời */
  @VersionColumn()
  version: number;
}
