import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailySale } from './entities/daily-sale.entity';
import { SaleDetail } from './entities/sale-detail.entity';
import { Product } from '../products/entities/product.entity';
import { PrepareDailySaleDto } from './dto/prepare-daily-sale.dto';
import { TrackSaleDto } from './dto/track-sale.dto';
import { User } from '../users/entities/user.entity';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';

@Injectable()
export class SalesService {
    constructor(
        @InjectRepository(DailySale)
        private readonly dailySaleRepository: Repository<DailySale>,
        @InjectRepository(SaleDetail)
        private readonly saleDetailRepository: Repository<SaleDetail>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly dataSource: DataSource,
    ) { }

    // ── HU-03: Predicción de Demanda ─────────────────────
    async getPrediction(user: User): Promise<any> {
        // 1. Get current day of week (0=Sunday, 1=Monday...)
        const today = new Date().getDay(); // JS getDay() returns 0-6

        // 2. Find historical sales for this user on this day of week
        // We need: product_id, sum(quantity_sold) grouped by date
        // But simpler approximation: average quantity sold per product on this day
        // Let's use raw query for aggregation

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
            AND ds.sale_date < CURRENT_DATE -- Exclude today
            ORDER BY sd.product_id, ds.sale_date DESC
            LIMIT 100
        `, [user.id, today]);

        // Group by product
        const productSales: Record<string, number[]> = {};
        const productNames: Record<string, string> = {};

        history.forEach((row: any) => {
            if (!productSales[row.product_id]) {
                productSales[row.product_id] = [];
                productNames[row.product_id] = row.product_name;
            }
            productSales[row.product_id].push(Number(row.quantity_sold));
        });

        // Calculate stats
        const suggestions = Object.keys(productSales).map(productId => {
            const sales = productSales[productId];
            if (sales.length < 3) return null; // Not enough data

            // IQR Logic
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
                confidence: filtered.length / sales.length // simplistic confidence
            };
        }).filter(x => x !== null);

        // Return top suggestion (simplied for widget)
        return suggestions.length > 0 ? suggestions[0] : null;
    }

    // ── HU-04: Cierre de Día ─────────────────────────────
    async closeDay(user: User, wastes: { productId: string; waste: number }[]) {
        const dailySale = await this.findToday(user);
        if (!dailySale) throw new NotFoundException('No hay venta abierta hoy');
        if (dailySale.isClosed) throw new BadRequestException('El día ya está cerrado');

        for (const item of wastes) {
            const detail = dailySale.details.find(d => d.productId === item.productId);
            if (detail) {
                const waste = Number(item.waste);
                if (waste > detail.quantityPrepared) {
                    throw new BadRequestException(`Merma (${waste}) no puede exceder preparado (${detail.quantityPrepared}) para ${detail.product.name}`);
                }

                detail.quantityLost = waste;
                detail.quantitySold = detail.quantityPrepared - waste;
                await this.saleDetailRepository.save(detail);

                // Update inventory record (HU-04 fix)
                const activeInventory = await this.dataSource.getRepository(InventoryRecord).findOne({
                    where: {
                        productId: item.productId,
                        sellerId: user.id,
                        status: 'active'
                    }
                });

                if (activeInventory) {
                    activeInventory.quantityRemaining = 0;
                    if (detail.product.isPerishable) {
                        activeInventory.status = 'expired';
                    } else {
                        // Or 'closed' to signify end of day regardless 
                        activeInventory.status = 'closed';
                    }
                    await this.dataSource.getRepository(InventoryRecord).save(activeInventory);
                }
            }
        }

        dailySale.isClosed = true;
        await this.dailySaleRepository.save(dailySale);

        return this.recalculateHeader(dailySale.id);
    }

    /**
     * Finds today's active sales record for the user.
     */
    async findToday(user: User): Promise<DailySale | null> {
        return await this.dailySaleRepository.findOne({
            where: {
                sellerId: user.id,
                saleDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            },
            relations: ['details', 'details.product'],
        });
    }

    /**
     * Initializes a new daily sale record with prepared items.
     */
    async prepareDay(prepareDto: PrepareDailySaleDto, user: User): Promise<DailySale> {
        const existing = await this.findToday(user);
        if (existing) {
            throw new BadRequestException('Daily sale already initialized for today. Use update methods instead.');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Calculate Initial Investment
            let totalInvestment = 0;
            const details: SaleDetail[] = [];

            for (const item of prepareDto.items) {
                const product = await this.productRepository.findOneBy({ id: item.productId });
                if (!product) throw new BadRequestException(`Product ${item.productId} not found`);

                const detail = new SaleDetail();
                detail.product = product;
                detail.productId = product.id;
                detail.quantityPrepared = item.quantityPrepared;
                detail.unitCost = product.unitCost;
                detail.unitPrice = product.salePrice;
                detail.subtotal = item.quantityPrepared * Number(product.salePrice);

                totalInvestment += Number(product.unitCost) * item.quantityPrepared;
                details.push(detail);
            }

            // 2. Create Header
            const dailySale = new DailySale();
            dailySale.seller = user;
            dailySale.sellerId = user.id;
            dailySale.totalInvestment = totalInvestment;
            dailySale.saleDate = new Date().toISOString().split('T')[0];

            const savedSale = await queryRunner.manager.save(DailySale, dailySale);

            // 3. Save Details
            for (const detail of details) {
                detail.dailySale = savedSale;
                await queryRunner.manager.save(SaleDetail, detail);
            }

            await queryRunner.commitTransaction();

            // Return with relations
            const result = await this.dailySaleRepository.findOne({
                where: { id: savedSale.id },
                relations: ['details', 'details.product'],
            });

            if (!result) throw new NotFoundException('Error saving sale');
            return result;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Updates sold/lost quantities for a specific product in today's sale.
     */
    async trackProduct(trackDto: TrackSaleDto, user: User): Promise<DailySale> {
        const dailySale = await this.findToday(user);
        if (!dailySale) {
            throw new NotFoundException('No active daily sale found for today. Please initialize the day first.');
        }

        const detail = dailySale.details.find(d => d.productId === trackDto.productId);
        if (!detail) {
            // Optional: Auto-add logic if product wasn't prepared? For now, throw error.
            throw new NotFoundException('Product not found in today\'s records');
        }

        // Validate
        if (detail.quantityPrepared < (trackDto.quantitySold + trackDto.quantityLost)) {
            throw new BadRequestException('Cannot sell/lose more than prepared quantity');
        }

        // Update Detail
        detail.quantitySold = trackDto.quantitySold;
        detail.quantityLost = trackDto.quantityLost;
        await this.saleDetailRepository.save(detail);

        // Recalculate Header Stats (Revenue, Units)
        // Note: total_profit and subtotal are DB generated/stored, but let's update aggregated fields in app logic too if needed for immediate response
        return await this.recalculateHeader(dailySale.id);
    }

    private async recalculateHeader(dailySaleId: string): Promise<DailySale> {
        const sale = await this.dailySaleRepository.findOne({
            where: { id: dailySaleId },
            relations: ['details']
        });

        if (!sale) throw new NotFoundException('Sale not found');

        let totalRevenue = 0;
        let unitsSold = 0;
        let unitsLost = 0;

        for (const detail of sale.details) {
            totalRevenue += Number(detail.unitPrice) * detail.quantitySold;
            unitsSold += detail.quantitySold;
            unitsLost += detail.quantityLost;
        }

        sale.totalRevenue = totalRevenue;
        sale.unitsSold = unitsSold;
        sale.unitsLost = unitsLost;

        // Profit & Margin
        const profit = totalRevenue - Number(sale.totalInvestment);
        sale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        // Note: totalProfit is generated column in DB, but we do not write to it. 
        // If it was a real column we would set it here.

        return await this.dailySaleRepository.save(sale);
    }

    async getROI(user: User, startDate?: string, endDate?: string) {
        let qs = this.dailySaleRepository
            .createQueryBuilder('sale')
            .select('SUM(sale.totalInvestment)', 'sum_invest')
            .addSelect('SUM(sale.totalRevenue)', 'sum_revenue')
            .where('sale.sellerId = :sellerId', { sellerId: user.id });

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

    async getHistory(user: User) {
        return await this.dailySaleRepository.find({
            where: { sellerId: user.id },
            order: { saleDate: 'ASC' },
            take: 30 // Last 30 days
        });
    }
}
