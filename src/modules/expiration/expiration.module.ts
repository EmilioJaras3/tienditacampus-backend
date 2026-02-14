import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpirationService } from './expiration.service';
import { ExpirationController } from './expiration.controller';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';
import { DailySale } from '../sales/entities/daily-sale.entity';
import { SaleDetail } from '../sales/entities/sale-detail.entity';
import { Product } from '../products/entities/product.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([InventoryRecord, DailySale, SaleDetail, Product]),
    ],
    controllers: [ExpirationController],
    providers: [ExpirationService],
    exports: [ExpirationService],
})
export class ExpirationModule { }
