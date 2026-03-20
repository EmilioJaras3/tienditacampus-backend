import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategorySeedService implements OnModuleInit {
    private readonly logger = new Logger(CategorySeedService.name);

    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    async onModuleInit() {
        const categories = [
            { name: 'Snacks y Comidas', description: 'Todo tipo de snacks y alimentos preparados' },
            { name: 'Bebidas', description: 'Jugos, refrescos y agua' },
            { name: 'Postres', description: 'Dulces, pasteles y postres variados' },
        ];

        for (const catData of categories) {
            const existing = await this.categoryRepository.findOne({ where: { name: catData.name } });
            if (!existing) {
                const category = this.categoryRepository.create(catData);
                await this.categoryRepository.save(category);
                this.logger.log(`Category created: ${catData.name}`);
            }
        }
    }
}
