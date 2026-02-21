import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * AuditController — Endpoints para consultar los logs de auditoría (JSONB).
 *
 * Solo usuarios autenticados pueden ver logs.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    /**
     * GET /api/audit/my-activity
     * Retorna el historial de actividad del usuario autenticado.
     */
    @Get('my-activity')
    getMyActivity(@CurrentUser() user: { userId: string }) {
        return this.auditService.findByUser(user.userId);
    }

    /**
     * GET /api/audit/recent
     * Retorna los logs más recientes del sistema.
     */
    @Get('recent')
    getRecent(@Query('limit') limit?: string) {
        return this.auditService.getRecent(limit ? parseInt(limit) : 50);
    }

    /**
     * GET /api/audit/search?key=browser&value=Chrome
     * Busca dentro de la metadata JSONB.
     */
    @Get('search')
    searchByMetadata(
        @Query('key') key: string,
        @Query('value') value: string,
    ) {
        return this.auditService.findByMetadataKey(key, value);
    }
}
