import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DashboardService {
    constructor(private readonly dataSource: DataSource) { }

    async getComparison(user: User, startDate?: string, endDate?: string) {
        const weekComparison = await this.dataSource.query(
            `
            WITH current_period AS (
                SELECT
                    date_trunc('week', CURRENT_DATE)::date AS start_date,
                    (date_trunc('week', CURRENT_DATE)::date + interval '6 day')::date AS end_date
            ),
            previous_period AS (
                SELECT
                    (date_trunc('week', CURRENT_DATE)::date - interval '7 day')::date AS start_date,
                    (date_trunc('week', CURRENT_DATE)::date - interval '1 day')::date AS end_date
            ),
            current_data AS (
                SELECT
                    COALESCE(SUM(total_revenue), 0)::numeric(12,2) AS revenue,
                    COALESCE(SUM(total_investment), 0)::numeric(12,2) AS investment,
                    COALESCE(SUM(total_revenue - total_investment), 0)::numeric(12,2) AS profit
                FROM daily_sales ds, current_period cp
                WHERE ds.seller_id = $1
                  AND ds.sale_date BETWEEN cp.start_date AND cp.end_date
            ),
            previous_data AS (
                SELECT
                    COALESCE(SUM(total_revenue), 0)::numeric(12,2) AS revenue,
                    COALESCE(SUM(total_investment), 0)::numeric(12,2) AS investment,
                    COALESCE(SUM(total_revenue - total_investment), 0)::numeric(12,2) AS profit
                FROM daily_sales ds, previous_period pp
                WHERE ds.seller_id = $1
                  AND ds.sale_date BETWEEN pp.start_date AND pp.end_date
            )
            SELECT
                cp.start_date AS current_start,
                cp.end_date AS current_end,
                cd.revenue AS current_revenue,
                cd.investment AS current_investment,
                cd.profit AS current_profit,
                pp.start_date AS previous_start,
                pp.end_date AS previous_end,
                pd.revenue AS previous_revenue,
                pd.investment AS previous_investment,
                pd.profit AS previous_profit
            FROM current_period cp
            CROSS JOIN previous_period pp
            CROSS JOIN current_data cd
            CROSS JOIN previous_data pd
            `,
            [user.id],
        );

        const monthComparison = await this.dataSource.query(
            `
            WITH current_period AS (
                SELECT
                    date_trunc('month', CURRENT_DATE)::date AS start_date,
                    (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date AS end_date
            ),
            previous_period AS (
                SELECT
                    (date_trunc('month', CURRENT_DATE) - interval '1 month')::date AS start_date,
                    (date_trunc('month', CURRENT_DATE) - interval '1 day')::date AS end_date
            ),
            current_data AS (
                SELECT
                    COALESCE(SUM(total_revenue), 0)::numeric(12,2) AS revenue,
                    COALESCE(SUM(total_investment), 0)::numeric(12,2) AS investment,
                    COALESCE(SUM(total_revenue - total_investment), 0)::numeric(12,2) AS profit
                FROM daily_sales ds, current_period cp
                WHERE ds.seller_id = $1
                  AND ds.sale_date BETWEEN cp.start_date AND cp.end_date
            ),
            previous_data AS (
                SELECT
                    COALESCE(SUM(total_revenue), 0)::numeric(12,2) AS revenue,
                    COALESCE(SUM(total_investment), 0)::numeric(12,2) AS investment,
                    COALESCE(SUM(total_revenue - total_investment), 0)::numeric(12,2) AS profit
                FROM daily_sales ds, previous_period pp
                WHERE ds.seller_id = $1
                  AND ds.sale_date BETWEEN pp.start_date AND pp.end_date
            )
            SELECT
                cp.start_date AS current_start,
                cp.end_date AS current_end,
                cd.revenue AS current_revenue,
                cd.investment AS current_investment,
                cd.profit AS current_profit,
                pp.start_date AS previous_start,
                pp.end_date AS previous_end,
                pd.revenue AS previous_revenue,
                pd.investment AS previous_investment,
                pd.profit AS previous_profit
            FROM current_period cp
            CROSS JOIN previous_period pp
            CROSS JOIN current_data cd
            CROSS JOIN previous_data pd
            `,
            [user.id],
        );

        const from = startDate ?? null;
        const to = endDate ?? null;
        const profitabilityByProduct = await this.dataSource.query(
            `
            WITH range_ref AS (
                SELECT
                    COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date) AS start_date,
                    COALESCE($3::date, CURRENT_DATE::date) AS end_date
            )
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                COALESCE(SUM(sd.quantity_sold * sd.unit_price), 0)::numeric(12,2) AS revenue,
                COALESCE(SUM(sd.quantity_sold * sd.unit_cost), 0)::numeric(12,2) AS investment,
                COALESCE(SUM(sd.quantity_sold * (sd.unit_price - sd.unit_cost)), 0)::numeric(12,2) AS profit,
                CASE
                    WHEN COALESCE(SUM(sd.quantity_sold * sd.unit_price), 0) > 0
                        THEN ROUND(
                            (COALESCE(SUM(sd.quantity_sold * (sd.unit_price - sd.unit_cost)), 0)
                            / COALESCE(SUM(sd.quantity_sold * sd.unit_price), 0)::numeric) * 100,
                            2
                        )
                    ELSE 0
                END AS margin_pct
            FROM products p
            LEFT JOIN sale_details sd ON sd.product_id = p.id
            LEFT JOIN daily_sales ds ON ds.id = sd.daily_sale_id
            CROSS JOIN range_ref rr
            WHERE p.seller_id = $1
              AND (ds.sale_date IS NULL OR ds.sale_date BETWEEN rr.start_date AND rr.end_date)
            GROUP BY p.id, p.name
            ORDER BY profit DESC, product_name ASC
            `,
            [user.id, from, to],
        );

        return {
            weekComparison: weekComparison[0] ?? null,
            monthComparison: monthComparison[0] ?? null,
            profitabilityByProduct,
        };
    }
}
