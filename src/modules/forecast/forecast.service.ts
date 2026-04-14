import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ForecastService {
    private readonly logger = new Logger(ForecastService.name);

    constructor(private dataSource: DataSource) { }

    // Ejecución diaria a las 03:00 AM - DESACTIVADO ya que usamos query directa
    // @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleCron() {
        this.logger.log('Daily materialization refresh skipped - Using direct queries.');
    }

    async getForecast(productId: string, dayOfWeek: number): Promise<number> {
        const result = await this.dataSource.query(
            `
            WITH daily_stats AS (
                SELECT 
                    ds.sale_date,
                    sd.product_id,
                    sd.quantity_sold,
                    sd.quantity_lost,
                    COALESCE(ir.status, 'active') as inventory_status
                FROM daily_sales ds
                JOIN sale_details sd ON ds.id = sd.daily_sale_id
                LEFT JOIN inventory_records ir ON ir.product_id = sd.product_id AND ir.record_date = ds.sale_date AND ir.seller_id = ds.seller_id
                WHERE sd.product_id = $1
                  AND EXTRACT(ISODOW FROM ds.sale_date) = $2
                  AND ds.is_closed = true
                  AND ds.sale_date >= CURRENT_DATE - INTERVAL '28 days'
            ),
            calculated_demand AS (
                SELECT 
                    sale_date,
                    product_id,
                    CASE 
                        WHEN inventory_status = 'sold_out' THEN quantity_sold * 1.25
                        WHEN quantity_lost > 0 THEN quantity_sold
                        ELSE quantity_sold
                    END as estimated_demand
                FROM daily_stats
            ),
            ranked_demand AS (
                SELECT 
                    product_id,
                    estimated_demand,
                    ROW_NUMBER() OVER(ORDER BY sale_date DESC) as recency_rank
                FROM calculated_demand
            )
            SELECT 
                FLOOR(
                    SUM(
                        CASE recency_rank
                            WHEN 1 THEN estimated_demand * 0.40
                            WHEN 2 THEN estimated_demand * 0.30
                            WHEN 3 THEN estimated_demand * 0.20
                            WHEN 4 THEN estimated_demand * 0.10
                            ELSE 0
                        END
                    ) / 
                    NULLIF(SUM(
                        CASE recency_rank
                            WHEN 1 THEN 0.40
                            WHEN 2 THEN 0.30
                            WHEN 3 THEN 0.20
                            WHEN 4 THEN 0.10
                            ELSE 0
                        END
                    ), 0)
                )::int AS recommended_quantity
            FROM ranked_demand
            WHERE recency_rank <= 4
            GROUP BY product_id;
            `,
            [productId, dayOfWeek]
        );

        if (result && result.length > 0 && result[0].recommended_quantity !== null) {
            return result[0].recommended_quantity;
        }

        return 0;
    }
}
