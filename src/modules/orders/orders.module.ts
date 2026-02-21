import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { DailySale } from '../sales/entities/daily-sale.entity';
import { SaleDetail } from '../sales/entities/sale-detail.entity';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Order,
            OrderItem,
            DailySale,
            SaleDetail,
            InventoryRecord,
            Product,
            User,
        ])
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
