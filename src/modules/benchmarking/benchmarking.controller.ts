import { Controller, Post, Get, Headers, UnauthorizedException, Query } from '@nestjs/common';
import { BenchmarkingService } from './benchmarking.service';

@Controller('benchmarking')
export class BenchmarkingController {
    constructor(private readonly benchmarkingService: BenchmarkingService) { }

    @Post('snapshot')
    async takeSnapshot(@Headers('authorization') authHeader: string) {
        if (!authHeader) {
            throw new UnauthorizedException('Se requiere token de autenticación (Google OAuth)');
        }
        return this.benchmarkingService.processDailySnapshot(authHeader);
    }

    @Post('run-queries')
    async runQueries() {
        await this.benchmarkingService.runRegisteredQueries();
        return { message: 'Consultas de benchmarking ejecutadas con éxito' };
    }

    @Get('project')
    async getProject() {
        const projectId = await this.benchmarkingService.getCurrentProjectId();
        return { project_id: projectId };
    }

    @Get('metrics')
    async getMetrics(@Query('limit') limit?: string) {
        return this.benchmarkingService.getQueryMetrics(limit ? parseInt(limit) : 20);
    }
}
