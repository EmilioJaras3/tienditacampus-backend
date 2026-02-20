import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hash } from '@node-rs/argon2';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Busca un usuario activo por email.
     * Incluye password_hash para verificación en auth.
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email: email.toLowerCase(), isActive: true },
        });
    }

    /**
     * Busca un usuario por ID.
     */
    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id, isActive: true },
        });
    }

    async getPublicProfile(id: string): Promise<Partial<User>> {
        const user = await this.usersRepository.findOne({
            where: { id, isActive: true },
            select: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'createdAt', 'role']
        });

        if (!user) {
            throw new NotFoundException('Vendedor no encontrado');
        }

        return user;
    }

    /**
     * Crea un nuevo usuario con contraseña hasheada con Argon2.
     */
    async create(dto: CreateUserDto): Promise<User> {
        // Verificar que el email no exista
        const existing = await this.usersRepository.findOne({
            where: { email: dto.email.toLowerCase() },
        });
        if (existing) {
            throw new ConflictException('El email ya está registrado');
        }

        // Hashear contraseña con Argon2id
        const passwordHash = await hash(dto.password, {
            memoryCost: this.configService.get<number>('ARGON2_MEMORY_COST', 65536),
            timeCost: this.configService.get<number>('ARGON2_TIME_COST', 3),
            parallelism: this.configService.get<number>('ARGON2_PARALLELISM', 4),
        });

        const user = this.usersRepository.create({
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone ?? null,
        });

        return this.usersRepository.save(user) as Promise<User>;
    }

    /**
     * Actualiza datos del perfil (sin email ni contraseña).
     */
    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        Object.assign(user, dto);
        return this.usersRepository.save(user);
    }

    // ── Trazabilidad UX ───────────────────────────────────

    /**
     * Registra un login exitoso: incrementa login_count,
     * actualiza last_login_at, resetea intentos fallidos.
     */
    async recordSuccessfulLogin(id: string): Promise<void> {
        await this.usersRepository.update(id, {
            lastLoginAt: new Date(),
            loginCount: () => 'login_count + 1',
            failedLoginAttempts: 0,
            lockedUntil: null,
        } as any);
    }

    /**
     * Registra un intento de login fallido.
     * Bloquea la cuenta si supera el umbral configurado.
     */
    async recordFailedLogin(id: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) return;

        const newAttempts = user.failedLoginAttempts + 1;
        const maxAttempts = this.configService.get<number>(
            'MAX_FAILED_LOGIN_ATTEMPTS',
            5,
        );

        const updateData: Partial<User> = {
            failedLoginAttempts: newAttempts,
        };

        // Bloquear cuenta si supera el máximo
        if (newAttempts >= maxAttempts) {
            const lockoutMinutes = this.configService.get<number>(
                'LOCKOUT_DURATION_MINUTES',
                15,
            );
            updateData.lockedUntil = new Date(
                Date.now() + lockoutMinutes * 60 * 1000,
            );
        }

        await this.usersRepository.update(id, updateData);
    }

    /**
     * Actualiza la fecha de cambio de contraseña.
     */
    async updatePasswordChangedAt(id: string): Promise<void> {
        await this.usersRepository.update(id, {
            passwordChangedAt: new Date(),
        });
    }
}
