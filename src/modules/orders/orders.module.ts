import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { DailySale } from "../sales/entities/daily-sale.entity";
import { SaleDetail } from "../sales/entities/sale-detail.entity";
import { InventoryRecord } from "../inventory/entities/inventory-record.entity";
import { Product } from "../products/entities/product.entity";
import { User } from "../users/entities/user.entity";
import { InventoryModule } from "../inventory/inventory.module";
import { CreateOrderUseCase } from "./use-cases/create-order.use-case";
import { DeliverOrderUseCase } from "./use-cases/deliver-order.use-case";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      InventoryRecord,
      DailySale,
      SaleDetail,
    ]),
    InventoryModule,
    AuditModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CreateOrderUseCase, DeliverOrderUseCase],
  exports: [OrdersService],
})
export class OrdersModule {}