import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateOrderDto } from "../dto/create-order.dto";
import { User } from "../../users/entities/user.entity";
import { Order } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { Product } from "../../products/entities/product.entity";
import { InventoryRecord } from "../../inventory/entities/inventory-record.entity";
import { TransactionManager } from "../../../shared/utils/transaction-manager.util";
import { AuditService } from "../../audit/audit.service";

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly transactionManager: TransactionManager,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateOrderDto, buyer: User): Promise<Order> {
    return this.transactionManager.execute(async (queryRunner) => {
      let totalOrderAmount = 0;
      const orderItemsToSave: OrderItem[] = [];

      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId, sellerId: dto.sellerId, isActive: true },
        });

        if (!product) {
          throw new NotFoundException(
            `Producto ${item.productId} no encontrado o inactivo`,
          );
        }

        const activeInventory = await queryRunner.manager.findOne(
          InventoryRecord,
          {
            where: { productId: product.id, status: "active" },
          },
        );

        if (
          !activeInventory ||
          activeInventory.quantityRemaining < item.quantity
        ) {
          throw new BadRequestException(
            `Sin stock suficiente para el producto: ${product.name}`,
          );
        }

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

      let order = new Order();
      order.buyerId = buyer.id;
      order.sellerId = dto.sellerId;
      order.totalAmount = totalOrderAmount;
      order.status = "requested";
      order.deliveryMessage = dto.deliveryMessage || null;

      order = await queryRunner.manager.save(Order, order);

      for (const orderItem of orderItemsToSave) {
        orderItem.order = order;
        orderItem.orderId = order.id;
        await queryRunner.manager.save(OrderItem, orderItem);
      }

      await this.auditService.log({
        action: "ORDER_CREATED",
        userId: buyer.id,
        entityType: "orders",
        entityId: order.id,
        description: `Pedido #${order.id.substring(0, 8)} creado por ${buyer.email} para el vendedor ${order.sellerId}`,
        metadata: {
          totalAmount: order.totalAmount,
          itemsCount: orderItemsToSave.length,
        },
      });

      const finalOrder = await queryRunner.manager.findOne(Order, {
        where: { id: order.id },
        relations: ["items", "items.product", "seller"],
      });

      if (!finalOrder)
        throw new InternalServerErrorException(
          "Error recuperando la orden guardada",
        );
      return finalOrder;
    }, "Fallo al procesar la creación de la orden");
  }
}