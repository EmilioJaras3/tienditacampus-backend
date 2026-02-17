import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailySale } from '../entities/daily-sale.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export interface ISalesRepository {
  findToday(sellerId: string): Promise<DailySale | null>;
  createDailySale(dailySale: DailySale, details: SaleDetail[]): Promise<DailySale>;
  saveSaleDetail(detail: SaleDetail): Promise<SaleDetail>;
  findSaleWithDetails(id: string): Promise<DailySale | null>;
  updateSale(id: string, updates: Partial<DailySale>): Promise<void>;
  closeDay(dailySale: DailySale): Promise<DailySale>;
  findProduct(productId: string): Promise<any>;
  consumeInventory(productId: string, userId: string, units: number): Promise<void>;
  getROI(sellerId: string, startDate?: string, endDate?: string): Promise<{ investment: number; revenue: number; netProfit: number; roi: number }>;
  getHistory(sellerId: string): Promise<DailySale[]>;
  getByWeekdayAnalytics(sellerId: string, startDate?: string, endDate?: string): Promise<any[]>;
  getPrediction(sellerId: string): Promise<any>;
}

@Injectable()
export class SalesRepository implements ISalesRepository {
  constructor(
    @InjectRepository(DailySale)
    private readonly dailySaleRepository: Repository<DailySale>,
    @InjectRepository(SaleDetail)
    private readonly saleDetailRepository: Repository<SaleDetail>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findToday(sellerId: string): Promise<DailySale | null> {
    return await this.dailySaleRepository.findOne({
      where: {
        sellerId,
        saleDate: new Date().toISOString().split('T')[0],
      },
      relations: ['details', 'details.product'],
    });
  }

  async createDailySale(dailySale: DailySale, details: SaleDetail[]): Promise<DailySale> {
    const savedSale = await this.dailySaleRepository.save(dailySale);
    
    // Save details with relation to sale
    for (const detail of details) {
      detail.dailySale = savedSale;
      await this.saleDetailRepository.save(detail);
    }
    
    const result = await this.findSaleWithDetails(savedSale.id);
    if (!result) {
      throw new Error('Failed to create daily sale');
    }
    return result;
  }

  async saveSaleDetail(detail: SaleDetail): Promise<SaleDetail> {
    return await this.saleDetailRepository.save(detail);
  }

  async findSaleWithDetails(id: string): Promise<DailySale | null> {
    return await this.dailySaleRepository.findOne({
      where: { id },
      relations: ['details'],
    });
  }

  async updateSale(id: string, updates: Partial<DailySale>): Promise<void> {
    await this.dailySaleRepository.update(id, updates);
  }

  async getROI(sellerId: string, startDate?: string, endDate?: string): Promise<{ investment: number; revenue: number; netProfit: number; roi: number }> {
    let qs = this.dailySaleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalInvestment)', 'sum_invest')
      .addSelect('SUM(sale.totalRevenue)', 'sum_revenue')
      .where('sale.sellerId = :sellerId', { sellerId });

    if (startDate) {
      qs = qs.andWhere('sale.saleDate >= :startDate', { startDate });
    }
    if (endDate) {
      qs = qs.andWhere('sale.saleDate <= :endDate', { endDate });
    }

    const { sum_invest, sum_revenue } = await qs.getRawOne();

    const investment = Number(sum_invest || 0);
    const revenue = Number(sum_revenue || 0);
    const netProfit = revenue - investment;
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;

    return {
      investment,
      revenue,
      netProfit,
      roi: Number(roi.toFixed(2))
    };
  }

  async getHistory(sellerId: string): Promise<DailySale[]> {
    return await this.dailySaleRepository.find({
      where: { sellerId },
      order: { saleDate: 'ASC' },
      take: 30,
      relations: ['details', 'details.product'], // Add relations to avoid N+1 if needed
    });
  }

  async getByWeekdayAnalytics(sellerId: string, startDate?: string, endDate?: string): Promise<any[]> {
    const params: any[] = [sellerId];
    let where = 'WHERE ds.seller_id = $1';

    if (startDate) {
      params.push(startDate);
      where += ` AND ds.sale_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      where += ` AND ds.sale_date <= $${params.length}`;
    }

    const rows = await this.dailySaleRepository.query(
      `
      SELECT
        EXTRACT(DOW FROM ds.sale_date)::int AS weekday,
        COUNT(*)::int AS days_count,
        COALESCE(SUM(ds.total_revenue), 0)::numeric(12,2) AS revenue_sum,
        COALESCE(SUM(ds.units_sold), 0)::int AS units_sold_sum,
        COALESCE(AVG(ds.total_revenue), 0)::numeric(12,2) AS revenue_avg
      FROM daily_sales ds
      ${where}
      GROUP BY EXTRACT(DOW FROM ds.sale_date)
      ORDER BY weekday ASC
      `,
      params,
    );

    const weekdayName: Record<number, string> = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado',
    };

    return rows.map((row: any) => ({
      weekday: Number(row.weekday),
      weekdayName: weekdayName[Number(row.weekday)] ?? 'desconocido',
      daysCount: Number(row.days_count),
      revenueSum: row.revenue_sum,
      unitsSoldSum: Number(row.units_sold_sum),
      revenueAvg: row.revenue_avg,
    }));
  }

  async getPrediction(sellerId: string): Promise<any> {
    const today = new Date().getDay();

    const history = await this.dailySaleRepository.query(`
      SELECT
        sd.product_id,
        p.name as product_name,
        sd.quantity_sold
      FROM sale_details sd
      INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
      INNER JOIN products p ON p.id = sd.product_id
      WHERE ds.seller_id = $1
      AND EXTRACT(DOW FROM ds.sale_date) = $2
      AND ds.sale_date < CURRENT_DATE
      ORDER BY sd.product_id, ds.sale_date DESC
      LIMIT 100
    `, [sellerId, today]);

    const productSales: Record<string, number[]> = {};
    const productNames: Record<string, string> = {};

    history.forEach((row: any) => {
      if (!productSales[row.product_id]) {
        productSales[row.product_id] = [];
        productNames[row.product_id] = row.product_name;
      }
      productSales[row.product_id].push(Number(row.quantity_sold));
    });

    const suggestions = Object.keys(productSales).map(productId => {
      const sales = productSales[productId];
      if (sales.length < 3) return null;

      sales.sort((a, b) => a - b);
      const q1 = sales[Math.floor((sales.length / 4))];
      const q3 = sales[Math.floor((sales.length * (3 / 4)))];

      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;

      const filtered = sales.filter(x => x >= lower && x <= upper);
      const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;

      return {
        productId,
        productName: productNames[productId],
        suggested: Math.ceil(avg),
        confidence: filtered.length / sales.length
      };
    }).filter(x => x !== null);

    return suggestions.length > 0 ? suggestions[0] : null;
  }

  async findProduct(productId: string): Promise<Product | null> {
    return await this.productRepository.findOne({ where: { id: productId } });
  }

  async consumeInventory(productId: string, userId: string, units: number): Promise<void> {
    // Simplified inventory consumption - in real implementation would use FIFO logic
    // For now, this is a placeholder that doesn't actually consume inventory
    console.log(`Consuming ${units} units of product ${productId} for user ${userId}`);
  }

  async closeDay(dailySale: DailySale): Promise<DailySale> {
    // Recalculate metrics before closing
    let totalRevenue = 0;
    let unitsSold = 0;
    let unitsLost = 0;
    let totalWasteCost = 0;

    for (const detail of dailySale.details) {
      totalRevenue += Number(detail.unitPrice) * detail.quantitySold;
      unitsSold += detail.quantitySold;
      unitsLost += detail.quantityLost;
      totalWasteCost += Number(detail.wasteCost || 0);
    }

    dailySale.totalRevenue = totalRevenue;
    dailySale.unitsSold = unitsSold;
    dailySale.unitsLost = unitsLost;
    dailySale.totalWasteCost = totalWasteCost;

    const profit = totalRevenue - Number(dailySale.totalInvestment);
    dailySale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Calculate break even units
    if (dailySale.unitsSold > 0) {
      const avgSalePrice = totalRevenue / dailySale.unitsSold;
      const unitsPrepared = dailySale.unitsSold + dailySale.unitsLost;
      const avgUnitCost = unitsPrepared > 0 ? Number(dailySale.totalInvestment) / unitsPrepared : 0;

      const wasteRate = unitsPrepared > 0 ? dailySale.unitsLost / unitsPrepared : 0;
      const effectiveUnitCost = avgUnitCost * (1 + wasteRate);
      const unitMargin = avgSalePrice - effectiveUnitCost;

      if (unitMargin > 0) {
        dailySale.breakEvenUnits = Number((Number(dailySale.totalInvestment) / unitMargin).toFixed(2));
      } else {
        dailySale.breakEvenUnits = null;
      }
    } else {
      dailySale.breakEvenUnits = null;
    }

    return await this.dailySaleRepository.save(dailySale);
  }
}
