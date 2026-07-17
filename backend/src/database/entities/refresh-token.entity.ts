import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseDbEntity } from './base.entity';
import { UserEntity } from './user.entity';

/**
 * Bảng refresh_tokens — phiên đăng nhập dài hạn (JWT refresh).
 * CHỈ lưu hash của token, không lưu token thô.
 */
@Entity('refresh_tokens')
export class RefreshTokenEntity extends BaseDbEntity {
  @Index('idx_refresh_tokens_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'token_hash', type: 'varchar', length: 128, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Thời điểm thu hồi chủ động (logout/đổi mật khẩu) — null nếu còn hiệu lực */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'device_info', type: 'varchar', length: 255, nullable: true })
  deviceInfo: string | null;
}
