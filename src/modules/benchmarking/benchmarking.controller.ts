import { Controller, Post, Get, Headers, UnauthorizedException, BadRequestException, Query, Body, Res, Logger, Redirect } from '@nestjs/common';
import { Response } from 'express';
import { BenchmarkingService } from './benchmarking.service';
import { OAuthBigQueryService } from './auth/oauth-bigquery.service';
import { SnapshotService } from './snapshots/snapshot.service';

@Controller('benchmarking')
export class BenchmarkingController {
    private readonly logger = new Logger(BenchmarkingController.name);

    constructor(
        private readonly benchmarkingService: BenchmarkingService,
        private readonly oauthService: OAuthBigQueryService,
        private readonly snapshotService: SnapshotService,
    ) { }

    // --- Flujo de Métricas y Consultas ---

    @Get('project')
    async getProject() {
        const projectId = await this.benchmarkingService.getCurrentProjectId();
        return { project_id: projectId };
    }

    @Get('metrics')
    async getMetrics(@Query('limit') limit?: string) {
        return this.benchmarkingService.getQueryMetrics(limit ? parseInt(limit) : 20);
    }

    @Post('run-queries')
    async runQueries() {
        await this.benchmarkingService.runRegisteredQueries();
        return { message: 'Consultas de benchmarking ejecutadas con éxito' };
    }

    // --- Flujo de Snapshots (BigQuery) ---

    @Post('snapshot')
    async takeSnapshot(@Headers('authorization') authHeader: string) {
        if (!authHeader) {
            throw new UnauthorizedException('Se requiere token de autenticación (Google OAuth)');
        }
        return this.benchmarkingService.processDailySnapshot(authHeader);
    }

    @Post('snapshots/execute')
    async executeSnapshot(@Body() body: { accessToken: string }) {
        if (!body.accessToken) {
            throw new UnauthorizedException('Access token required');
        }
        return this.snapshotService.executeDailySnapshot(body.accessToken);
    }

    // --- Flujo de Autenticación Google OAuth ---

    @Get('auth/google')
    googleAuth() {
        const authUrl = this.oauthService.getAuthUrl();
        return { url: authUrl };
    }

    @Get('auth/callback')
    async googleCallback(
        @Query('code') code: string,
        @Res() res: Response,
    ) {
        try {
            if (!code) throw new BadRequestException('No code provided');
            const tokens = await this.oauthService.getTokenFromCode(code);
            res.redirect(`/dashboard/benchmarking?token=${tokens.accessToken}`);
        } catch (error) {
            this.logger.error('OAuth callback failed:', error.message);
            res.status(500).send(`Authentication failed: ${error.message}`);
        }
    }

    // --- Exportación ---

    @Get('snapshots/export/:projectId')
    async exportCSV(@Query('projectId') projectId: number, @Res() res: Response) {
        const csv = await this.snapshotService.exportToCSV(projectId);
        const filename = `project_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }
}
