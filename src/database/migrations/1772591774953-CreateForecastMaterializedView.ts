import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateForecastMaterializedView1772591774953 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE MATERIALIZED VIEW vw_daily_production_forecast AS
            WITH daily_stats AS (
                -- Primero obtenemos las estadísticas diarias de ventas por producto
                SELECT 
                    ds.sale_date,
                    EXTRACT(ISODOW FROM ds.sale_date) as day_of_week,
                    sd.product_id,
                    sd.quantity_sold,
                    sd.quantity_lost,
                    COALESCE(ir.status, 'active') as inventory_status
                FROM daily_sales ds
                JOIN sale_details sd ON ds.id = sd.daily_sale_id
                LEFT JOIN inventory_records ir ON ir.product_id = sd.product_id AND ir.record_date = ds.sale_date AND ir.seller_id = ds.seller_id
                WHERE ds.is_closed = true
                  AND ds.sale_date >= CURRENT_DATE - INTERVAL '28 days' -- Últimas 4 semanas
            ),
            calculated_demand AS (
                -- Calculamos la demanda real estimada
                SELECT 
                    sale_date,
                    day_of_week,
                    product_id,
                    CASE 
                        WHEN inventory_status = 'sold_out' THEN quantity_sold * 1.25 -- Ajuste empírico
                        WHEN quantity_lost > 0 THEN quantity_sold
                        ELSE quantity_sold -- Demanda cubierta
                    END as estimated_demand
                FROM daily_stats
            ),
            ranked_demand AS (
                -- Numeramos las observaciones por producto y día de la semana (1 = más reciente)
                SELECT 
                    product_id,
                    day_of_week,
                    estimated_demand,
                    ROW_NUMBER() OVER(PARTITION BY product_id, day_of_week ORDER BY sale_date DESC) as recency_rank
                FROM calculated_demand
            )
            -- Finalmente calculamos el EWMA modificado (40%, 30%, 20%, 10%)
            SELECT 
                product_id,
                day_of_week,
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
                    -- Normalización en caso de que no hayan pasado las 4 semanas completas para ese día
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
            GROUP BY product_id, day_of_week;
        `);

        // Crear un índice único necesario para refrescar la vista CONCURRENTLY
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_forecast_product_day 
            ON vw_daily_production_forecast(product_id, day_of_week);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS vw_daily_production_forecast;`);
    }
}
