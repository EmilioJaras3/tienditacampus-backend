import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import { ResendTwoFactorDto } from './dto/resend-2fa.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * POST /api/auth/register
     * Crea un usuario nuevo y retorna JWT para auto-login.
     */
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    /**
     * POST /api/auth/login
     * Autentica con email+password y retorna JWT.
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    /**
     * POST /api/auth/verify-2fa
     * Verifica el código 2FA y retorna el JWT.
     */
    @Post('verify-2fa')
    @HttpCode(HttpStatus.OK)
    async verify2fa(@Body() dto: VerifyTwoFactorDto) {
        return this.authService.verify2fa(dto);
    }

    /**
     * POST /api/auth/resend-2fa
     * Reenvía un nuevo código 2FA.
     */
    @Post('resend-2fa')
    @HttpCode(HttpStatus.OK)
    async resend2fa(@Body() dto: ResendTwoFactorDto) {
        return this.authService.resend2fa(dto);
    }

    /**
     * POST /api/auth/google
     * Autentica (o registra) con token de OAuth2 de Google.
     */
    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleLogin(@Body() dto: GoogleLoginDto) {
        return this.authService.loginWithGoogle(dto);
    }

    /**
     * GET /api/auth/profile
     * Retorna el perfil del usuario autenticado.
     * Requiere JWT válido en el header Authorization.
     */
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.id);
    }
}
