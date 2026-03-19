import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * JWT Strategy para Passport.
 *
 * Extrae el token del header Authorization (Bearer),
 * lo decodifica, y valida que el usuario siga activo.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>('JWT_SECRET') || 'dev-secret-change-me',
        });
    }

    /**
     * Este método se ejecuta DESPUÉS de que Passport valida la firma del JWT.
     * El payload contiene { sub, email, role, iat, exp }.
     * Retorna el objeto que se inyecta en request.user.
     */
    async validate(payload: { sub: string; email: string; role: string }) {
        // Verificar que el usuario sigue activo en la BD
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('Token inválido: usuario no encontrado');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Cuenta desactivada');
        }

        // Verificar que la cuenta no esté bloqueada
        if (user.isLocked) {
            throw new UnauthorizedException('Cuenta bloqueada temporalmente');
        }

        return user;
    }
}
