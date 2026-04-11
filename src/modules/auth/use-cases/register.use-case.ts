/* RegisterUseCase.ts */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { AuditService } from '../../audit/audit.service';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUseCase {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
    ) { }

    async execute(dto: RegisterDto) {
        const user = await this.usersService.create(dto);
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        await this.auditService.log({
            action: 'user.register',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
            description: `Registro: ${user.email}`,
        });

        return { user, accessToken };
    }
}
