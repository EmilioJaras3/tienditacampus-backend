import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { AuditService } from '../../audit/audit.service';
import { GoogleLoginDto } from '../dto/google-login.dto';

@Injectable()
export class GoogleLoginUseCase {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
    ) { }

    async execute(dto: GoogleLoginDto) {
        try {
            const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${dto.token}` }
            });

            if (!googleResponse.ok) throw new UnauthorizedException('Token de Google inválido');

            const data = await googleResponse.json();
            const email = data.email.toLowerCase();

            let user = await this.usersService.findByEmail(email);

            const adminEmails = (process.env.ADMIN_EMAILS || 'jarassanchezl@gmail.com').toLowerCase().split(',');
            const assignedRole = adminEmails.includes(email) ? 'admin' : 'buyer';

            if (!user) {
                user = await this.usersService.create({
                    email,
                    password: `Gg#${Math.random().toString(36).slice(-8)}A1!x`,
                    firstName: data.given_name || 'Usuario',
                    lastName: data.family_name || 'Google',
                    role: assignedRole as any
                });
            } else if (user.role !== assignedRole) {
                await this.usersService.updateRole(user.id, assignedRole as any);
                user.role = assignedRole as any;
            }

            await this.usersService.recordSuccessfulLogin(user.id);
            const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });

            await this.auditService.log({
                action: 'user.login_google',
                entityType: 'user',
                entityId: user.id,
                userId: user.id,
                description: `Login SSO Google: ${user.email}`,
            });

            return { user, accessToken };
        } catch (error) {
            throw new UnauthorizedException('Error en autenticación Google SSO');
        }
    }
}
