import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';
import { DailySale } from '../sales/entities/daily-sale.entity';
import { SaleDetail } from '../sales/entities/sale-detail.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
        private readonly dataSource: DataSource,
    ) { }

    async createOrder(dto: CreateOrderDto, buyer: User): Promise<Order> {
        if (buyer.id === dto.sellerId) {
            throw new BadRequestException('Un vendedor no puede comprar sus propios productos en esta transacción');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let totalOrderAmount = 0;
            const orderItemsToSave: OrderItem[] = [];

            // 1. Process each item in the order against Inventory
            for (const item of dto.items) {
                const product = await queryRunner.manager.findOne(Product, {
                    where: { id: item.productId, sellerId: dto.sellerId, isActive: true }
                });

                if (!product) {
                    throw new NotFoundException(`Producto ${item.productId} no encontrado o inactivo`);
                }

                // Verify stock exists (but don't deduct yet)
                const activeInventory = await queryRunner.manager.findOne(InventoryRecord, {
                    where: { productId: product.id, status: 'active' }
                });

                if (!activeInventory || activeInventory.quantityRemaining < item.quantity) {
                    throw new BadRequestException(`Sin stock suficiente para el producto: ${product.name}`);
                }

                // calculate item total
                const subtotal = item.quantity * Number(product.salePrice);
                totalOrderAmount += subtotal;

                const orderItem = new OrderItem();
                orderItem.product = product;
                orderItem.productId = product.id;
                orderItem.quantity = item.quantity;
                orderItem.unitPrice = product.salePrice;
                orderItem.subtotal = subtotal;

                orderItemsToSave.push(orderItem);
            }

            // 2. Create the Order
            let order = new Order();
            order.buyerId = buyer.id;
            order.sellerId = dto.sellerId;
            order.totalAmount = totalOrderAmount;
            order.status = 'requested'; // Changed from 'pending', now stock is only deducted on accept
            order.deliveryMessage = dto.deliveryMessage || null;

            order = await queryRunner.manager.save(Order, order);

            // Save Items
            for (const orderItem of orderItemsToSave) {
                orderItem.order = order;
                orderItem.orderId = order.id;
                await queryRunner.manager.save(OrderItem, orderItem);
            }

            await queryRunner.commitTransaction();

            const finalOrder = await this.orderRepo.findOne({
                where: { id: order.id },
                relations: ['items', 'items.product', 'seller']
            });
            if (!finalOrder) throw new InternalServerErrorException('Error recuperando la orden guardada');
            return finalOrder;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Purchase Transaction Error:', error);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('No se pudo procesar la compra.');
        } finally {
            await queryRunner.release();
        }
    }

    async acceptOrder(orderId: string, seller: User): Promise<Order> {
        const order = await this.orderRepo.findOne({
            where: { id: orderId },
            relations: ['items', 'items.product']
        });

        if (!order) throw new NotFoundException('Orden no encontrada');
        if (order.sellerId !== seller.id) throw new BadRequestException('No tienes permiso para aceptar esta orden');
        if (order.status !== 'requested') throw new BadRequestException('La orden no está en estado solicitado');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Deduct stock
            for (const item of order.items) {
                const activeInventory = await queryRunner.manager.findOne(InventoryRecord, {
                    where: { productId: item.productId, status: 'active' }
                });

                if (!activeInventory || activeInventory.quantityRemaining < item.quantity) {
                    throw new BadRequestException(`Sin stock suficiente para completar la orden del producto: ${item.product?.name}`);
                }

                activeInventory.quantityRemaining -= item.quantity;
                if (activeInventory.quantityRemaining === 0) {
                    activeInventory.status = item.product?.isPerishable ? 'expired' : 'sold_out';
                }
                await queryRunner.manager.save(InventoryRecord, activeInventory);
            }

            order.status = 'pending'; // Aceptado, listo para entregar
            await queryRunner.manager.save(Order, order);
            await queryRunner.commitTransaction();
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('No se pudo aceptar la orden.');
        } finally {
            await queryRunner.release();
        }
    }

    async rejectOrder(orderId: string, seller: User): Promise<Order> {
        const order = await this.orderRepo.findOne({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Orden no encontrada');
        if (order.sellerId !== seller.id) throw new BadRequestException('No tienes permiso para rechazar esta orden');
        if (order.status !== 'requested') throw new BadRequestException('Solo puedes rechazar órdenes solicitadas');

        order.status = 'rejected';
        return this.orderRepo.save(order);
    }

    async deliverOrder(orderId: string, user: User): Promise<Order> {
        const order = await this.orderRepo.findOne({
            where: { id: orderId },
            relations: ['items', 'items.product', 'seller', 'buyer']
        });

        if (!order) {
            throw new NotFoundException('Orden no encontrada');
        }

        if (order.status !== 'pending') {
            throw new BadRequestException('Esta orden ya fue procesada o cancelada');
        }

        if (order.buyerId !== user.id && order.sellerId !== user.id) {
            throw new BadRequestException('No tienes permiso para confirmar esta orden');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Update the Order status
            order.status = 'completed';
            await queryRunner.manager.save(Order, order);

            // Trigger the DailySale Tracking
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
                let saleDetail = dailySale.details.find(d => d.productId === orderItem.productId);

                if (!saleDetail) {
                    saleDetail = new SaleDetail();
                    saleDetail.dailySaleId = dailySale.id;
                    saleDetail.productId = orderItem.productId;
                    saleDetail.quantityPrepared = 0;
                    saleDetail.quantitySold = 0;
                    saleDetail.quantityLost = 0;
                    saleDetail.unitCost = await this.getUnitCost(queryRunner, orderItem.productId);
                    saleDetail.unitPrice = orderItem.unitPrice;
                    saleDetail.subtotal = 0;
                }

                saleDetail.quantitySold += orderItem.quantity;
                saleDetail.subtotal = saleDetail.quantitySold * Number(saleDetail.unitPrice);
                await queryRunner.manager.save(SaleDetail, saleDetail);
            }

            // Recalculate DailySale Aggregates
            const allDetails = await queryRunner.manager.find(SaleDetail, { where: { dailySaleId: dailySale.id } });

            let totalRevenue = 0;
            let unitsSold = 0;
            let totalInvestment = 0;

            for (const d of allDetails) {
                totalRevenue += Number(d.unitPrice) * d.quantitySold;
                unitsSold += d.quantitySold;
                const investmentContrib = d.quantityPrepared > 0 ? d.quantityPrepared : d.quantitySold;
                totalInvestment += Number(d.unitCost) * investmentContrib;
            }

            dailySale.totalRevenue = totalRevenue;
            dailySale.totalInvestment = totalInvestment;
            dailySale.unitsSold = unitsSold;

            const profit = totalRevenue - totalInvestment;
            dailySale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

            await queryRunner.manager.save(DailySale, dailySale);

            await queryRunner.commitTransaction();

            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Delivery Transaction Error:', error);
            throw new InternalServerErrorException('Error al confirmar la recepción');
        } finally {
            await queryRunner.release();
        }
    }

    private async getUnitCost(queryRunner: any, productId: string): Promise<number> {
        const prod = await queryRunner.manager.findOne(Product, { where: { id: productId } });
        return prod ? Number(prod.unitCost) : 0;
    }

    async getBuyerPurchases(buyer: User) {
        return this.orderRepo.find({
            where: { buyerId: buyer.id },
            relations: ['seller', 'items', 'items.product'],
            order: { createdAt: 'DESC' }
        });
    }

    async getSellerSales(seller: User) {
        return this.orderRepo.find({
            where: { sellerId: seller.id },
            relations: ['buyer', 'items', 'items.product'],
            order: { createdAt: 'DESC' }
        });
    }
}
