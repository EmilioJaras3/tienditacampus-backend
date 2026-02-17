import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan, EntityManager } from 'typeorm';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';
import { DailySale } from '../sales/entities/daily-sale.entity';
import { SaleDetail } from '../sales/entities/sale-detail.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ExpirationService {
    private readonly logger = new Logger(ExpirationService.name);

    constructor(private readonly dataSource: DataSource) { }

    /**
     * Cron Job: Se ejecuta todos los días a las 00:01.
     * Busca lotes de inventario cuya fecha de caducidad ya pasó
     * y genera registros de merma automática.
     */
    @Cron('0 1 0 * * *', { name: 'auto-expiration', timeZone: 'America/Mexico_City' })
    async handleCronExpiration(): Promise<void> {
        this.logger.log('⏰ [CRON] Iniciando evaluación automática de caducidad...');
        const result = await this.processExpiredInventory();
        this.logger.log(
            `✅ [CRON] Evaluación completada. ` +
            `Lotes expirados: ${result.lotsExpired}, ` +
            `Unidades perdidas: ${result.totalUnitsLost}, ` +
            `Costo de merma: $${result.totalWasteCost.toFixed(2)}`
        );
    }

    /**
     * Motor principal de expiración. Puede llamarse desde el cron
     * o desde un endpoint manual de pruebas.
     */
    async processExpiredInventory(): Promise<{
        lotsExpired: number;
        totalUnitsLost: number;
        totalWasteCost: number;
    }> {
        const todayStr = new Date().toISOString().split('T')[0];

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let lotsExpired = 0;
        let totalUnitsLost = 0;
        let totalWasteCost = 0;

        try {
            const manager = queryRunner.manager;

            // 1. Buscar todos los lotes activos cuya fecha de caducidad ya pasó
            const expiredLots = await manager
                .createQueryBuilder(InventoryRecord, 'ir')
                .leftJoinAndSelect('ir.product', 'product')
                .where('ir.status = :status', { status: 'active' })
                .andWhere('ir.quantity_remaining > 0')
                .andWhere('ir.expires_at IS NOT NULL')
                .andWhere('ir.expires_at < :today', { today: todayStr })
                .getMany();

            if (expiredLots.length === 0) {
                await queryRunner.commitTransaction();
                return { lotsExpired: 0, totalUnitsLost: 0, totalWasteCost: 0 };
            }

            // Agrupar lotes expirados por vendedor para actualizar DailySale por vendedor
            const sellerWasteMap = new Map<string, { units: number; cost: number; details: { productId: string; quantity: number; unitCost: number }[] }>();

            for (const lot of expiredLots) {
                const unitsLost = lot.quantityRemaining;
                const unitCost = Number(lot.product?.unitCost || lot.investmentAmount / lot.quantityInitial);
                const wasteCost = unitsLost * unitCost;

                // 2a. Marcar el lote como expirado
                lot.quantityRemaining = 0;
                lot.status = 'expired';
                await manager.save(InventoryRecord, lot);

                // Acumular por vendedor
                if (!sellerWasteMap.has(lot.sellerId)) {
                    sellerWasteMap.set(lot.sellerId, { units: 0, cost: 0, details: [] });
                }
                const sellerData = sellerWasteMap.get(lot.sellerId)!;
                sellerData.units += unitsLost;
                sellerData.cost += wasteCost;
                sellerData.details.push({
                    productId: lot.productId,
                    quantity: unitsLost,
                    unitCost,
                });

                lotsExpired++;
                totalUnitsLost += unitsLost;
                totalWasteCost += wasteCost;
            }

            // 3. Para cada vendedor, crear/actualizar DailySale y SaleDetails
            for (const [sellerId, wasteData] of sellerWasteMap) {
                // Buscar o crear el DailySale del día actual
                let dailySale = await manager.findOne(DailySale, {
                    where: { sellerId, saleDate: todayStr },
                });

                if (!dailySale) {
                    dailySale = new DailySale();
                    dailySale.sellerId = sellerId;
                    dailySale.saleDate = todayStr;
                    dailySale.totalInvestment = 0;
                    dailySale.totalRevenue = 0;
                    dailySale.unitsSold = 0;
                    dailySale.unitsLost = 0;
                    dailySale.totalWasteCost = 0;
                    dailySale.details = [];
                    dailySale = await manager.save(DailySale, dailySale);
                }

                // Agrupar detalles de merma por producto (un producto puede tener varios lotes expirados)
                const productWasteMap = new Map<string, { quantity: number; unitCost: number }>();
                for (const detail of wasteData.details) {
                    if (!productWasteMap.has(detail.productId)) {
                        productWasteMap.set(detail.productId, { quantity: 0, unitCost: detail.unitCost });
                    }
                    productWasteMap.get(detail.productId)!.quantity += detail.quantity;
                }

                // 3c. Crear/Actualizar SaleDetail por cada producto con merma
                for (const [productId, pwData] of productWasteMap) {
                    // Buscar el producto para obtener el precio de venta
                    const product = await manager.findOne(Product, { where: { id: productId } });
                    const unitPrice = product ? Number(product.salePrice) : 0;

                    // Buscar si ya existe un SaleDetail para este producto en el día
                    const existingDetail = await manager.findOne(SaleDetail, {
                        where: { dailySaleId: dailySale.id, productId }
                    });

                    if (existingDetail) {
                        // Sumar la merma al detalle existente
                        existingDetail.quantityLost += pwData.quantity;
                        existingDetail.wasteCost = Number(existingDetail.wasteCost) + (pwData.quantity * pwData.unitCost);
                        existingDetail.wasteReason = 'expired';
                        await manager.save(SaleDetail, existingDetail);
                    } else {
                        // Crear nuevo detalle de merma
                        const saleDetail = new SaleDetail();
                        saleDetail.dailySaleId = dailySale.id;
                        saleDetail.productId = productId;
                        saleDetail.quantityPrepared = 0;
                        saleDetail.quantitySold = 0;
                        saleDetail.quantityLost = pwData.quantity;
                        saleDetail.unitCost = pwData.unitCost;
                        saleDetail.unitPrice = unitPrice;
                        saleDetail.wasteReason = 'expired';
                        saleDetail.wasteCost = pwData.quantity * pwData.unitCost;
                        await manager.save(SaleDetail, saleDetail);
                    }
                }

                // 3d. Actualizar totales del DailySale usando UPDATE parcial (más seguro)
                const newUnitsLost = (Number(dailySale.unitsLost) || 0) + wasteData.units;
                const newWasteCost = Number(dailySale.totalWasteCost || 0) + wasteData.cost;

                await manager.update(DailySale, dailySale.id, {
                    unitsLost: newUnitsLost,
                    totalWasteCost: newWasteCost,
                });
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('❌ Error en evaluación de caducidad:', error);
            throw error;
        } finally {
            await queryRunner.release();
        }

        return { lotsExpired, totalUnitsLost, totalWasteCost };
    }
}
