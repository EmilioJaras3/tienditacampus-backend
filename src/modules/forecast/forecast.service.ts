import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ForecastService {
    private readonly logger = new Logger(ForecastService.name);

    constructor(private dataSource: DataSource) { }

    // Ejecución diaria a las 03:00 AM
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleCron() {
        this.logger.log('Starting daily materialization refresh for Forecast View...');
        try {
            // CONCURRENTLY permite refrescar sin bloquear consultas SELECT simultáneas
            await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY vw_daily_production_forecast;');
            this.logger.log('Successfully refreshed vw_daily_production_forecast.');
        } catch (error) {
            this.logger.error('Failed to refresh vw_daily_production_forecast', error.stack);
        }
    }

    async getForecast(productId: string, dayOfWeek: number): Promise<number> {
        const result = await this.dataSource.query(
            `SELECT recommended_quantity 
       FROM vw_daily_production_forecast 
       WHERE product_id = $1 AND day_of_week = $2;`,
            [productId, dayOfWeek]
        );

        if (result && result.length > 0) {
            return result[0].recommended_quantity;
        }

        // Si no hay histórico, retorna 0 (o algún valor por defecto de negocio)
        return 0;
    }
}
