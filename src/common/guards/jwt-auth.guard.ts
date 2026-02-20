import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard reutilizable para proteger endpoints con JWT.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('protected')
 *   async protectedRoute(@CurrentUser() user) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
