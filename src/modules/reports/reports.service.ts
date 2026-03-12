import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WeeklyReport } from './entities/weekly-report.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(WeeklyReport)
        private readonly weeklyReportRepository: Repository<WeeklyReport>,
        private readonly dataSource: DataSource,
    ) { }

    async generateWeeklyReport(user: User, weekStart?: string) {
        await this.dataSource.query(
            `
            WITH target_week AS (
                SELECT COALESCE($2::date, date_trunc('week', CURRENT_DATE)::date) AS week_start
            ),
            weekly_base AS (
                SELECT
                    $1::uuid AS seller_id,
                    tw.week_start,
                    (tw.week_start + interval '6 day')::date AS week_end,
                    COALESCE(SUM(ds.total_revenue), 0)::numeric(10,2) AS total_revenue,
                    COALESCE(SUM(ds.total_investment), 0)::numeric(10,2) AS total_investment,
                    COALESCE(AVG(ds.profit_margin), 0)::numeric(5,2) AS avg_profit_margin,
                    COALESCE(SUM(ds.units_sold), 0)::int AS total_units_sold,
                    COALESCE(SUM(ds.units_lost), 0)::int AS total_units_lost,
                    COALESCE(SUM(ds.total_waste_cost), 0)::numeric(10,2) AS total_waste_cost
                FROM target_week tw
                LEFT JOIN daily_sales ds
                    ON ds.seller_id = $1
                    AND ds.sale_date BETWEEN tw.week_start AND (tw.week_start + interval '6 day')::date
                GROUP BY tw.week_start
            ),
            best_product AS (
                SELECT
                    sd.product_id,
                    SUM(sd.quantity_sold) AS sold_units,
                    ROW_NUMBER() OVER (ORDER BY SUM(sd.quantity_sold) DESC, sd.product_id) AS rn
                FROM sale_details sd
                INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
                INNER JOIN target_week tw
                    ON ds.sale_date BETWEEN tw.week_start AND (tw.week_start + interval '6 day')::date
                WHERE ds.seller_id = $1
                GROUP BY sd.product_id
            )
            INSERT INTO weekly_reports (
                seller_id,
                week_start,
                week_end,
                total_investment,
                total_revenue,
                total_profit,
                avg_profit_margin,
                total_units_sold,
                total_units_lost,
                total_waste_cost,
                loss_percentage,
                best_selling_product
            )
            SELECT
                wb.seller_id,
                wb.week_start,
                wb.week_end,
                wb.total_investment,
                wb.total_revenue,
                (wb.total_revenue - wb.total_investment)::numeric(10,2) AS total_profit,
                wb.avg_profit_margin,
                wb.total_units_sold,
                wb.total_units_lost,
                wb.total_waste_cost,
                CASE
                    WHEN (wb.total_units_sold + wb.total_units_lost) > 0
                        THEN ROUND((wb.total_units_lost::numeric * 100) / (wb.total_units_sold + wb.total_units_lost), 2)
                    ELSE 0
                END AS loss_percentage,
                (SELECT bp.product_id FROM best_product bp WHERE bp.rn = 1)
            FROM weekly_base wb
            ON CONFLICT (seller_id, week_start)
            DO UPDATE SET
                week_end = EXCLUDED.week_end,
                total_investment = EXCLUDED.total_investment,
                total_revenue = EXCLUDED.total_revenue,
                total_profit = EXCLUDED.total_profit,
                avg_profit_margin = EXCLUDED.avg_profit_margin,
                total_units_sold = EXCLUDED.total_units_sold,
                total_units_lost = EXCLUDED.total_units_lost,
                total_waste_cost = EXCLUDED.total_waste_cost,
                loss_percentage = EXCLUDED.loss_percentage,
                best_selling_product = EXCLUDED.best_selling_product
            `,
            [user.id, weekStart ?? null],
        );

        const targetWeek = weekStart ?? undefined;
        return this.getWeeklyReports(user, targetWeek, targetWeek);
    }

    async getWeeklyReports(user: User, startWeek?: string, endWeek?: string) {
        const qb = this.weeklyReportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.bestSellingProduct', 'bestProduct')
            .where('report.sellerId = :sellerId', { sellerId: user.id })
            .orderBy('report.weekStart', 'DESC');

        if (startWeek) {
            qb.andWhere('report.weekStart >= :startWeek', { startWeek });
        }
        if (endWeek) {
            qb.andWhere('report.weekStart <= :endWeek', { endWeek });
        }

        return qb.getMany();
    }
}
