import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InventoryRecord } from './entities/inventory-record.entity';
import { CreateInventoryRecordDto } from './dto/create-inventory-record.dto';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(InventoryRecord)
        private readonly inventoryRepository: Repository<InventoryRecord>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async addStock(createInventoryDto: CreateInventoryRecordDto, user: User): Promise<InventoryRecord> {
        // Buscar el producto para obtener isPerishable y shelfLifeDays
        const product = await this.productRepository.findOne({
            where: { id: createInventoryDto.productId, sellerId: user.id, isActive: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado para el vendedor autenticado');
        }

        // Calcular fecha de caducidad para productos perecederos
        let expiresAt: string | null = null;
        if (product.isPerishable && product.shelfLifeDays !== null && product.shelfLifeDays !== undefined) {
            const baseDateStr = createInventoryDto.recordDate || new Date().toISOString().split('T')[0];
            const [year, month, day] = baseDateStr.split('-').map(Number);
            const baseDate = new Date(Date.UTC(year, month - 1, day));
            baseDate.setUTCDate(baseDate.getUTCDate() + product.shelfLifeDays);
            expiresAt = baseDate.toISOString().split('T')[0];
        }

        const record = this.inventoryRepository.create({
            ...createInventoryDto,
            expiresAt,
            quantityInitial: createInventoryDto.quantity,
            quantityRemaining: createInventoryDto.quantity,
            investmentAmount: createInventoryDto.quantity * createInventoryDto.unitCost,
            seller: user,
            sellerId: user.id,
            status: 'active',
        });

        return await this.inventoryRepository.save(record);
    }

    async getHistoryByProduct(productId: string, user: User): Promise<InventoryRecord[]> {
        return await this.inventoryRepository.find({
            where: { productId, sellerId: user.id },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Motor FIFO: Consume inventario del lote más viejo primero.
     *
     * Orden de consumo:
     *   1. record_date ASC (primero lo que entró antes)
     *   2. expires_at ASC NULLS LAST (primero lo que caduca antes; no perecederos al final)
     *
     * @param productId   - ID del producto a descontar
     * @param sellerId    - ID del vendedor dueño del inventario
     * @param quantity    - Unidades a consumir
     * @param manager     - EntityManager de la transacción activa (QueryRunner)
     * @returns Total de unidades efectivamente consumidas
     */
    async consumeFIFO(
        productId: string,
        sellerId: string,
        quantity: number,
        manager: EntityManager,
    ): Promise<number> {
        if (quantity <= 0) return 0;

        // Buscar lotes activos con stock, ordenados FIFO
        const activeLots = await manager
            .createQueryBuilder(InventoryRecord, 'ir')
            .where('ir.product_id = :productId', { productId })
            .andWhere('ir.seller_id = :sellerId', { sellerId })
            .andWhere('ir.status = :status', { status: 'active' })
            .andWhere('ir.quantity_remaining > 0')
            .orderBy('ir.record_date', 'ASC')
            .addOrderBy('ir.expires_at', 'ASC', 'NULLS LAST')
            .getMany();

        // Validar stock total disponible
        const totalAvailable = activeLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
        if (totalAvailable < quantity) {
            throw new BadRequestException(
                `Stock insuficiente para producto ${productId}. ` +
                `Disponible: ${totalAvailable}, Requerido: ${quantity}`
            );
        }

        let remaining = quantity;
        let totalConsumed = 0;

        for (const lot of activeLots) {
            if (remaining <= 0) break;

            const canConsume = Math.min(lot.quantityRemaining, remaining);
            lot.quantityRemaining -= canConsume;
            remaining -= canConsume;
            totalConsumed += canConsume;

            // Si el lote quedó vacío, marcarlo como sold_out
            if (lot.quantityRemaining === 0) {
                lot.status = 'sold_out';
            }

            await manager.save(InventoryRecord, lot);
        }

        return totalConsumed;
    }
}
