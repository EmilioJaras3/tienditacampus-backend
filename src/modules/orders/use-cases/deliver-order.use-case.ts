import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { DailySale } from '../../sales/entities/daily-sale.entity';
import { SaleDetail } from '../../sales/entities/sale-detail.entity';
import { InventoryService } from '../../inventory/inventory.service';
import { TransactionManager } from '../../../shared/utils/transaction-manager.util';

@Injectable()
export class DeliverOrderUseCase {
    constructor(
        @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
        private readonly inventoryService: InventoryService,
        private readonly transactionManager: TransactionManager,
    ) { }

    async execute(orderId: string, user: User): Promise<Order> {
        return this.transactionManager.execute(async (queryRunner) => {
            const order = await queryRunner.manager.findOne(Order, {
                where: { id: orderId },
                relations: ['items', 'items.product', 'seller', 'buyer']
            });

            if (!order) throw new NotFoundException('Orden no encontrada');
            if (order.status !== 'pending' && order.status !== 'accepted') {
                throw new BadRequestException('Esta orden ya fue procesada o cancelada');
            }
            if (order.buyerId !== user.id && order.sellerId !== user.id) {
                throw new BadRequestException('No tienes permiso para confirmar esta orden');
            }

            // 1. FIFO: Consumir inventario
            for (const item of order.items) {
                await this.inventoryService.consumeFIFO(
                    item.productId,
                    order.sellerId,
                    item.quantity,
                    queryRunner.manager,
                );
            }

            // 2. Update status
            order.status = 'completed';
            await queryRunner.manager.save(Order, order);

            // 3. Trigger DailySale Tracking
            await this.syncDailySale(queryRunner, order);

            return order;
        }, 'Fallo al procesar la entrega de la orden');
    }

    private async syncDailySale(queryRunner: any, order: Order) {
        const todayStr = new Date().toISOString().split('T')[0];
        let dailySale = await queryRunner.manager.findOne(DailySale, {
            where: { sellerId: order.sellerId, saleDate: todayStr },
            relations: ['details']
        });

        if (!dailySale) {
            dailySale = new DailySale();
            dailySale.sellerId = order.sellerId;
            dailySale.saleDate = todayStr;
            dailySale.totalInvestment = 0;
            dailySale.totalRevenue = 0;
            dailySale.unitsSold = 0;
            dailySale.unitsLost = 0;
            dailySale.details = [];
            dailySale = await queryRunner.manager.save(DailySale, dailySale);
        }

        for (const orderItem of order.items) {
            const details = (dailySale.details || []) as SaleDetail[];
            let saleDetail = details.find(d => d.productId === orderItem.productId);
            let isNewDetail = false;

            if (!saleDetail) {
                saleDetail = new SaleDetail();
                saleDetail.dailySaleId = dailySale.id;
                saleDetail.productId = orderItem.productId;
                saleDetail.quantityPrepared = 0;
                saleDetail.quantitySold = 0;
                saleDetail.quantityLost = 0;
                saleDetail.unitCost = await this.getUnitCost(queryRunner, orderItem.productId);
                saleDetail.unitPrice = orderItem.unitPrice;
                isNewDetail = true;
            }

            saleDetail.quantitySold += orderItem.quantity;
            if (isNewDetail) dailySale.details.push(saleDetail);
            else await queryRunner.manager.save(SaleDetail, saleDetail);
        }

        // Recalculate aggregates
        this.recalculateAggregates(dailySale);

        await queryRunner.manager.save(DailySale, dailySale);
        
        // Force update to bypass TypeORM diffing bugs
        await queryRunner.manager.update(DailySale, dailySale.id, {
            totalRevenue: dailySale.totalRevenue,
            totalInvestment: dailySale.totalInvestment,
            unitsSold: dailySale.unitsSold,
            unitsLost: dailySale.unitsLost,
            totalWasteCost: dailySale.totalWasteCost,
            profitMargin: dailySale.profitMargin,
            breakEvenUnits: dailySale.breakEvenUnits
        });
    }

    private recalculateAggregates(dailySale: DailySale) {
        let totalRevenue = 0;
        let unitsSold = 0;
        let unitsLost = 0;
        let totalInvestment = 0;
        let totalWasteCost = 0;

        for (const d of dailySale.details as SaleDetail[]) {
            totalRevenue += Number(d.unitPrice) * d.quantitySold;
            unitsSold += d.quantitySold;
            unitsLost += d.quantityLost;
            const investmentContrib = d.quantityPrepared > 0 ? d.quantityPrepared : d.quantitySold;
            totalInvestment += Number(d.unitCost) * investmentContrib;
            totalWasteCost += Number(d.wasteCost || 0);
        }

        dailySale.totalRevenue = totalRevenue;
        dailySale.totalInvestment = totalInvestment;
        dailySale.unitsSold = unitsSold;
        dailySale.unitsLost = unitsLost;
        dailySale.totalWasteCost = totalWasteCost;

        const profit = totalRevenue - totalInvestment;
        dailySale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        if (unitsSold > 0) {
            const avgSalePrice = totalRevenue / unitsSold;
            const unitsPrepared = unitsSold + unitsLost;
            const avgUnitCost = unitsPrepared > 0 ? totalInvestment / unitsPrepared : 0;
            const wasteRate = unitsPrepared > 0 ? unitsLost / unitsPrepared : 0;
            const effectiveUnitCost = avgUnitCost * (1 + wasteRate);
            const unitMargin = avgSalePrice - effectiveUnitCost;

            if (unitMargin > 0) {
                dailySale.breakEvenUnits = Number((totalInvestment / unitMargin).toFixed(2));
            }
        }
    }

    private async getUnitCost(queryRunner: any, productId: string): Promise<number> {
        const prod = await queryRunner.manager.findOne(Product, { where: { id: productId } });
        return prod ? Number(prod.unitCost) : 0;
    }
}
