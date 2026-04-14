import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from '@node-rs/argon2';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import { ResendTwoFactorDto } from './dto/resend-2fa.dto';
import { MailerService } from '../mailer/mailer.service';
import { TwoFactorService } from '../two-factor/two-factor.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
        private readonly twoFactorService: TwoFactorService,
    ) { }

    async register(dto: RegisterDto) {
        const user = await this.usersService.create({
            email: dto.email,
            password: dto.password,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            role: dto.role,
        });

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

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

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email.toLowerCase());

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (user.isLocked && user.lockedUntil) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000,
            );
            throw new ForbiddenException(
                `Cuenta bloqueada temporalmente. Intenta de nuevo en ${remainingMinutes} minuto(s).`,
            );
        }

        const isPasswordValid = await verify(user.passwordHash, dto.password);

        if (!isPasswordValid) {
            await this.usersService.recordFailedLogin(user.id);

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

        // 2FA - Generar código en lugar de retornar el token directamente
        const twoFactorCode = await this.twoFactorService.generateCode(user.id);
        await this.mailerService.send2faCode(user.email, twoFactorCode);

        return {
            requiresTwoFactor: true,
            message: 'Código de verificación enviado a tu correo electrónico',
        };
    }

    async verify2fa(dto: VerifyTwoFactorDto) {
        const user = await this.usersService.findByEmail(dto.email.toLowerCase());
        
        if (!user) {
            throw new UnauthorizedException('Código o usuario inválido');
        }

        const isCodeValid = await this.twoFactorService.verifyCode(user.id, dto.code);
        if (!isCodeValid) {
            throw new UnauthorizedException('Código inválido o expirado');
        }

        // Si el código es correcto, procedemos a generar JWT
        await this.usersService.recordSuccessfulLogin(user.id);

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        await this.auditService.log({
            action: 'user.login_2fa',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            description: `Login 2FA exitoso: ${user.email}`,
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

    async resend2fa(dto: ResendTwoFactorDto) {
        const user = await this.usersService.findByEmail(dto.email.toLowerCase());
        
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }
        
        const twoFactorCode = await this.twoFactorService.generateCode(user.id);
        await this.mailerService.send2faCode(user.email, twoFactorCode);

        return {
            message: 'Nuevo código de verificación enviado a tu correo',
        };
    }

    async loginWithGoogle(dto: GoogleLoginDto) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${dto.token}` }
            });

            if (!response.ok) {
                throw new UnauthorizedException('Token de Google inválido o expirado');
            }

            const data = await response.json();
            const email = data.email.toLowerCase();

            let user = await this.usersService.findByEmail(email);

            const adminEmails = (process.env.ADMIN_EMAILS || 'jarassanchezl@gmail.com,jarassabchezl@gmail.com').toLowerCase().split(',');
            const assignedRole = adminEmails.includes(email) ? 'admin' : 'buyer';

            if (!user) {
                const randomPassword = `Gg#${Math.random().toString(36).slice(-8)}A1!x`;
                await this.usersService.create({
                    email: email,
                    password: randomPassword,
                    firstName: data.given_name || 'Usuario',
                    lastName: data.family_name || 'Google',
                    role: assignedRole as any
                });
                user = await this.usersService.findByEmail(email);
            } else if (user.role !== assignedRole && assignedRole === 'admin') {
                // Elevación automática de rol si es admin verificado
                await this.usersService.updateRole(user.id, 'admin');
                user.role = 'admin';
            }

            if (!user) {
                throw new Error('Fallo crítico al auto-registrar usuario con Google SSO');
            }

            await this.usersService.recordSuccessfulLogin(user.id);

            const payload = { sub: user.id, email: user.email, role: user.role };
            const accessToken = this.jwtService.sign(payload);

            await this.auditService.log({
                action: 'user.login_google',
                entityType: 'user',
                entityId: user.id,
                userId: user.id,
                description: `Login SSO exitoso (Google): ${user.email}`,
                metadata: {
                    email: user.email,
                    role: user.role,
                    provider: 'google',
                    timestamp: new Date().toISOString(),
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

        } catch (error) {
            console.error('SSO Google Error:', error);
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Fallo al validar credenciales con servidor de Google');
        }
    }

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

    /**
     * Rescate administrativo para desbloquear cuentas (Emergency Only)
     */
    async rescueAdmin(email: string, secret: string) {
        // Clave de rescate hardcoded para emergencia inmediata (aprobado por usuario)
        const RESCUE_SECRET = 'TC-ADMIN-RESCUE-2024';
        
        if (secret !== RESCUE_SECRET) {
            throw new ForbiddenException('Clave de rescate inválida');
        }

        const user = await this.usersService.findByEmail(email.toLowerCase());
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        await this.usersService.recordSuccessfulLogin(user.id); // Esto limpia los bloqueos
        
        // Aseguramos que el email esté verificado si es admin
        if (user.role === 'admin') {
            await this.usersService.updateEmailVerified(user.id, true);
        }

        await this.auditService.log({
            action: 'user.rescue',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            description: `RESCATE ADMINISTRATIVO ejecutado para: ${user.email}`,
            metadata: {
                email: user.email,
                timestamp: new Date().toISOString(),
            },
        });

        return {
            message: `Cuenta ${user.email} desbloqueada exitosamente. Por favor, intenta iniciar sesión.`,
        };
    }

    async verifyEmail(email: string, code: string) {
        const user = await this.usersService.findByEmail(email.toLowerCase());
        if (!user) throw new NotFoundException('Usuario no encontrado');

        // Por ahora usamos el mismo TwoFactorService para validar el código de verificación
        const isValid = await this.twoFactorService.verifyCode(user.id, code);
        if (!isValid) throw new UnauthorizedException('Código de verificación inválido o expirado');

        await this.usersService.updateEmailVerified(user.id, true);

        return { message: 'Email verificado exitosamente' };
    }
}
