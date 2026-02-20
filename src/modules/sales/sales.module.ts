import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { DailySale } from './entities/daily-sale.entity';
import { SaleDetail } from './entities/sale-detail.entity';
import { Product } from '../products/entities/product.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DailySale, SaleDetail, Product])],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
