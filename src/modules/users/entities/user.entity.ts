import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * Entidad User — tabla `users`
 *
 * Mapeada 1:1 con la migración V001.
 * El campo password_hash se excluye automáticamente de las responses
 * gracias al decorador @Exclude() + ClassSerializerInterceptor.
 */
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Exclude()
    @Column({ type: 'varchar', length: 255, name: 'password_hash' })
    passwordHash: string;

    @Column({ type: 'varchar', length: 100, name: 'first_name' })
    firstName: string;

    @Column({ type: 'varchar', length: 100, name: 'last_name' })
    lastName: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
    avatarUrl: string | null;

    @Column({
        type: 'enum',
        enum: ['admin', 'seller', 'buyer'],
        default: 'seller',
    })
    role: 'admin' | 'seller' | 'buyer';

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_email_verified' })
    isEmailVerified: boolean;

    // ── Trazabilidad UX ───────────────────────────────────
    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'last_login_at',
    })
    lastLoginAt: Date | null;

    @Column({ type: 'int', default: 0, name: 'login_count' })
    loginCount: number;

    // ── Seguridad: Account Lockout ────────────────────────
    @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
    failedLoginAttempts: number;

    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'locked_until',
    })
    lockedUntil: Date | null;

    @Column({
        type: 'timestamptz',
        nullable: true,
        name: 'password_changed_at',
    })
    passwordChangedAt: Date | null;

    // ── Auditoría ─────────────────────────────────────────
    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;

    // ── Helpers ───────────────────────────────────────────

    /**
     * Verifica si la cuenta está bloqueada por intentos fallidos
     */
    get isLocked(): boolean {
        if (!this.lockedUntil) return false;
        return new Date() < this.lockedUntil;
    }
}
