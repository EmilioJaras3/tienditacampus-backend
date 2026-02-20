import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador @CurrentUser() — extrae el usuario del request.
 *
 * El objeto user es inyectado por JwtStrategy.validate()
 * y contiene { userId, email, role }.
 *
 * Uso:
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: { userId: string; email: string; role: string }) {
 *     return user;
 *   }
 *
 *   // O extraer un campo específico:
 *   getProfile(@CurrentUser('userId') userId: string) {
 *     return userId;
 *   }
 */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        return data ? user?.[data] : user;
    },
);
