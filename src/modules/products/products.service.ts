import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity';
import { InventoryRecord } from '../inventory/entities/inventory-record.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
        @InjectRepository(InventoryRecord)
        private readonly inventoryRepository: Repository<InventoryRecord>,
    ) { }

    async findAllCategories(): Promise<Category[]> {
        return await this.categoryRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    async create(createProductDto: CreateProductDto, user: User): Promise<Product> {
        const product = this.productRepository.create({
            ...createProductDto,
            seller: user,
            sellerId: user.id,
        });
        return await this.productRepository.save(product);
    }

    async findAll(user: User): Promise<any[]> {
        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'cat')
            .leftJoin('inventory_records', 'inventory', 'inventory.product_id = product.id')
            .select([
                'product.id',
                'product.name',
                'product.description',
                'product.unitCost',
                'product.salePrice',
                'product.isPerishable',
                'product.shelfLifeDays',
                'product.imageUrl',
                'product.isActive',
                'product.createdAt',
                'cat.id',
                'cat.name'
            ])
            .addSelect('COALESCE(SUM(inventory.quantity_remaining), 0)', 'stock')
            .where('product.sellerId = :sellerId', { sellerId: user.id })
            .andWhere('product.isActive = :isActive', { isActive: true })
            .groupBy('product.id')
            .addGroupBy('cat.id')
            .orderBy('product.createdAt', 'DESC');

        const rawResults = await qb.getRawMany();

        return rawResults.map(raw => ({
            id: raw.product_id,
            name: raw.product_name,
            description: raw.product_description,
            unitCost: parseFloat(raw.product_unit_cost),
            salePrice: parseFloat(raw.product_sale_price),
            isPerishable: raw.product_is_perishable,
            shelfLifeDays: raw.product_shelf_life_days,
            imageUrl: raw.product_image_url,
            isActive: raw.product_is_active,
            createdAt: raw.product_created_at,
            category: raw.cat_id ? {
                id: raw.cat_id,
                name: raw.cat_name
            } : null,
            stock: parseInt(raw.stock, 10)
        }));
    }

    async findMarketplace(query?: string, sellerId?: string, category?: string): Promise<any[]> {
        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoin('product.seller', 'seller')
            .leftJoin('product.category', 'cat')
            .innerJoin(
                'inventory_records', 'inventory',
                `inventory.product_id = product.id AND inventory.status = 'active' AND (inventory.expires_at IS NULL OR inventory.expires_at >= CURRENT_DATE)`
            )
            .select([
                'product.id',
                'product.name',
                'product.description',
                'product.salePrice',
                'product.imageUrl',
                'product.createdAt',
                'seller.id',
                'seller.firstName',
                'seller.lastName',
                'seller.avatarUrl',
                'cat.id',
                'cat.name'
            ])
            .addSelect('SUM(inventory.quantity_remaining)', 'quantityRemaining')
            .where('product.isActive = :isActive', { isActive: true })
            .andWhere('inventory.quantity_remaining > 0')
            .groupBy('product.id')
            .addGroupBy('product.name')
            .addGroupBy('product.description')
            .addGroupBy('product.salePrice')
            .addGroupBy('product.imageUrl')
            .addGroupBy('product.createdAt')
            .addGroupBy('seller.id')
            .addGroupBy('seller.firstName')
            .addGroupBy('seller.lastName')
            .addGroupBy('seller.avatarUrl')
            .addGroupBy('cat.id')
            .addGroupBy('cat.name')
            .orderBy('product.createdAt', 'DESC');

        if (sellerId) {
            qb.andWhere('seller.id = :sellerId', { sellerId });
        }

        if (category && category !== 'Todos') {
            qb.andWhere('cat.name = :category', { category });
        }

        if (query) {
            qb.andWhere('(product.name ILIKE :query OR product.description ILIKE :query)', { query: `%${query}%` });
        }

        const rawResults = await qb.getRawMany();

        return rawResults.map(raw => ({
            id: raw.product_id,
            name: raw.product_name,
            description: raw.product_description,
            salePrice: parseFloat(raw.product_salePrice),
            imageUrl: raw.product_imageUrl,
            createdAt: raw.product_createdAt,
            seller: {
                id: raw.seller_id,
                firstName: raw.seller_firstName,
                lastName: raw.seller_lastName,
                avatarUrl: raw.seller_avatarUrl
            },
            category: {
                id: raw.cat_id,
                name: raw.cat_name
            },
            quantityRemaining: parseInt(raw.quantityRemaining, 10)
        }));
    }

    async findOneMarketplace(id: string): Promise<Product> {
        const product = await this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.seller', 'seller')
            .where('product.id = :id', { id })
            .andWhere('product.isActive = :isActive', { isActive: true })
            .getOne();

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found or inactive`);
        }

        return product;
    }

    async findOne(id: string, user: User): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id, sellerId: user.id, isActive: true },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto, user: User): Promise<Product> {
        const product = await this.findOne(id, user); // Ensure ownership exists
        Object.assign(product, updateProductDto);
        return await this.productRepository.save(product);
    }

    async remove(id: string, user: User): Promise<void> {
        const product = await this.findOne(id, user);
        product.isActive = false; // Soft delete
        await this.productRepository.save(product);
    }
}
