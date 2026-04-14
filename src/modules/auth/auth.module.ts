import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.service.module' || '../audit/audit.module'; // Handle potential naming diffs
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginUseCase } from './use-cases/login.use-case';
import { RegisterUseCase } from './use-cases/register.use-case';
import { GoogleLoginUseCase } from './use-cases/google-login.use-case';

// Fixing the import based on actual file existence
import { AuditModule as ActualAuditModule } from '../audit/audit.module';

@Module({
    imports: [
        UsersModule,
        ActualAuditModule,
        TwoFactorModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret:
                    configService.get<string>('JWT_SECRET') || 'dev-secret-change-me',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION', '7d'),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        LoginUseCase,
        RegisterUseCase,
        GoogleLoginUseCase,
    ],
    exports: [AuthService],
})
export class AuthModule { }
