import { Controller, Post, UseGuards } from '@nestjs/common';
import { ExpirationService } from './expiration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expiration')
export class ExpirationController {
    constructor(private readonly expirationService: ExpirationService) { }

    /**
     * POST /api/expiration/run-manual
     * 
     * Endpoint de prueba para ejecutar la evaluación de caducidad
     * de forma manual sin esperar al cron de medianoche.
     * Protegido por JWT (solo usuarios autenticados).
     */
    @Post('run-manual')
    @UseGuards(JwtAuthGuard)
    async runManual() {
        const result = await this.expirationService.processExpiredInventory();
        return {
            message: 'Evaluación de caducidad ejecutada manualmente',
            ...result,
        };
    }
}
