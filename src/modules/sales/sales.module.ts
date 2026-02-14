import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesService } from './sales.service';

import { SalesController } from './sales.controller';

import { DailySale } from './entities/daily-sale.entity';

import { SaleDetail } from './entities/sale-detail.entity';

import { Product } from '../products/entities/product.entity';

import { InventoryRecord } from '../inventory/entities/inventory-record.entity';

import { InventoryModule } from '../inventory/inventory.module';

import { SalesRepository, ISalesRepository } from './repositories/sales.repository';

import { CreateDailySaleUseCase } from './use-cases/create-daily-sale.use-case';

import { CloseDayUseCase } from './use-cases/close-day.use-case';

import { TrackSaleUseCase } from './use-cases/track-sale.use-case';



@Module({

    imports: [TypeOrmModule.forFeature([DailySale, SaleDetail, Product, InventoryRecord]), InventoryModule],

    controllers: [SalesController],

    providers: [

        SalesService, 

        SalesRepository,

        {

            provide: 'ISalesRepository',

            useClass: SalesRepository,

        },

        CreateDailySaleUseCase, 

        CloseDayUseCase, 

        TrackSaleUseCase

    ],

    exports: [SalesService],

})

export class SalesModule { }

