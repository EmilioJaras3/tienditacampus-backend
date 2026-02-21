import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from '@node-rs/argon2';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * AuthService — Lógica de autenticación
 *
 * Flujo de login:
 *  1. Buscar usuario por email
 *  2. Verificar que la cuenta no esté bloqueada
 *  3. Verificar contraseña con Argon2
 *  4. Si falla: incrementar intentos fallidos (y posiblemente bloquear)
 *  5. Si acierta: resetear intentos, actualizar trazabilidad, generar JWT
 */
@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Registrar un usuario nuevo.
     * El hashing de contraseña ocurre dentro de UsersService.create()
     */
    async register(dto: RegisterDto) {
        const user = await this.usersService.create({
            email: dto.email,
            password: dto.password,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
        });

        // Generar token para auto-login después del registro
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        // ── Audit Log (JSONB) ──────────────────────────────
        await this.auditService.log({
            action: 'user.register',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            description: `Nuevo usuario registrado: ${user.email}`,
            metadata: {
                email: user.email,
                role: user.role,
                registeredAt: new Date().toISOString(),
            },
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            accessToken,
        };
    }

    /**
     * Iniciar sesión con email y contraseña.
     * Implementa account lockout y trazabilidad UX.
     */
    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email.toLowerCase());

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // ── Verificar bloqueo de cuenta ──────────────────────
        // ── Verificar bloqueo de cuenta ──────────────────────
        if (user.isLocked && user.lockedUntil) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000,
            );
            throw new ForbiddenException(
                `Cuenta bloqueada temporalmente. Intenta de nuevo en ${remainingMinutes} minuto(s).`,
            );
        }

        // ── Verificar contraseña con Argon2 ──────────────────
        const isPasswordValid = await verify(user.passwordHash, dto.password);

        if (!isPasswordValid) {
            // Registrar intento fallido (puede bloquear la cuenta)
            await this.usersService.recordFailedLogin(user.id);

            // ── Audit Log: Login fallido (JSONB) ──────────────
            await this.auditService.log({
                action: 'user.login_failed',
                entityType: 'user',
                entityId: user.id,
                userId: user.id,
                level: 'warn',
                description: `Intento de login fallido para ${dto.email}`,
                metadata: {
                    email: dto.email,
                    failedAttempts: user.failedLoginAttempts + 1,
                    timestamp: new Date().toISOString(),
                },
            });

            throw new UnauthorizedException('Credenciales inválidas');
        }

        // ── Login exitoso: actualizar trazabilidad ───────────
        await this.usersService.recordSuccessfulLogin(user.id);

        // ── Generar JWT ──────────────────────────────────────
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        // ── Audit Log: Login exitoso (JSONB) ──────────────
        await this.auditService.log({
            action: 'user.login',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            description: `Login exitoso: ${user.email}`,
            metadata: {
                email: user.email,
                role: user.role,
                loginCount: user.loginCount + 1,
                lastLoginAt: new Date().toISOString(),
            },
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                lastLoginAt: new Date().toISOString(),
                loginCount: user.loginCount + 1,
            },
            accessToken,
        };
    }

    /**
     * Retorna los datos del usuario autenticado (para GET /auth/profile).
     */
    async getProfile(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            loginCount: user.loginCount,
            createdAt: user.createdAt,
        };
    }
}
