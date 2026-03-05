import { Controller, Get } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Controller('health')
export class HealthController {
    constructor(
        @InjectEntityManager()
        private readonly entityManager: EntityManager,
    ) { }

    @Get()
    async check() {
        // Verificar conexión a Base de Datos
        let dbStatus = 'UP';
        try {
            await this.entityManager.query('SELECT 1');
        } catch (error) {
            dbStatus = 'DOWN';
        }

        return {
            status: dbStatus === 'UP' ? 'ok' : 'error',
            info: {
                database: { status: dbStatus },
                api: { status: 'UP' },
                timestamp: new Date().toISOString(),
                version: '1.2.0',
            },
        };
    }
}
