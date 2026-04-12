import {
    Entity,
    PrimaryColumn,
    Generated,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Entidad TwoFactorCode — tabla `two_factor_codes`
 *
 * Almacena códigos 2FA hasheados con expiración de 10 minutos.
 * Cada código solo puede usarse una vez.
 */
@Entity('two_factor_codes')
export class TwoFactorCode {
    @PrimaryColumn('uuid')
    @Generated('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 255, name: 'code_hash' })
    codeHash: string;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt: Date;

    @Column({ type: 'boolean', default: false })
    used: boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
