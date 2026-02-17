import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';
import { CategorySeedService } from './category-seed.service';

import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [TypeOrmModule.forFeature([Product, Category, InventoryRecord]), AuditModule],
    controllers: [ProductsController, CategoriesController],
    providers: [ProductsService, CategorySeedService],
    exports: [ProductsService],
})
export class ProductsModule { }
