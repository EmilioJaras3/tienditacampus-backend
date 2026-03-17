import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { Product } from './entities/product.entity';
import { CategorySeedService } from './category-seed.service';

@Module({
    imports: [TypeOrmModule.forFeature([Product, Category])],
    controllers: [ProductsController, CategoriesController],
    providers: [ProductsService, CategorySeedService],
    exports: [ProductsService],
})
export class ProductsModule { }
