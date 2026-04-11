import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from '@node-rs/argon2';
import { UsersService } from '../../users/users.service';
import { AuditService } from '../../audit/audit.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginUseCase {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
    ) { }

    async execute(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email.toLowerCase());

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (user.isLocked && user.lockedUntil) {
            const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new ForbiddenException(`Cuenta bloqueada. Intenta en ${remainingMinutes} min.`);
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
                description: `Login fallido para ${dto.email}`,
            });
            throw new UnauthorizedException('Credenciales inválidas');
        }

        await this.usersService.recordSuccessfulLogin(user.id);

        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

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
}
