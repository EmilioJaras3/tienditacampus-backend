import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(createProductDto: CreateProductDto, user: User): Promise<Product> {
        const product = this.productRepository.create({
            ...createProductDto,
            seller: user,
            sellerId: user.id,
        });
        return await this.productRepository.save(product);
    }

    async findAll(user: User): Promise<Product[]> {
        return await this.productRepository.find({
            where: { sellerId: user.id, isActive: true },
            order: { createdAt: 'DESC' },
        });
    }

    async findMarketplace(query?: string, sellerId?: string): Promise<any[]> {
        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.seller', 'seller')
            .innerJoin('inventory_records', 'inventory', 'inventory.product_id = product.id AND inventory.status = \'active\'')
            .addSelect('inventory.quantity_remaining', 'quantityRemaining')
            .where('product.isActive = :isActive', { isActive: true })
            .andWhere('inventory.quantity_remaining > 0');

        if (sellerId) {
            qb.andWhere('seller.id = :sellerId', { sellerId });
        }

        if (query) {
            qb.andWhere('(product.name ILIKE :query OR product.description ILIKE :query)', { query: `%${query}%` });
        }

        qb.orderBy('product.createdAt', 'DESC');

        const { entities, raw } = await qb.getRawAndEntities();

        return entities.map((entity, index) => {
            return {
                ...entity,
                quantityRemaining: parseInt(raw[index].quantityRemaining, 10),
            };
        });
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
