import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryRecord } from './entities/inventory-record.entity';
import { CreateInventoryRecordDto } from './dto/create-inventory-record.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(InventoryRecord)
        private readonly inventoryRepository: Repository<InventoryRecord>,
    ) { }

    async addStock(createInventoryDto: CreateInventoryRecordDto, user: User): Promise<InventoryRecord> {
        const record = this.inventoryRepository.create({
            ...createInventoryDto,
            quantityInitial: createInventoryDto.quantity,
            quantityRemaining: createInventoryDto.quantity,
            investmentAmount: createInventoryDto.quantity * createInventoryDto.unitCost,
            seller: user,
            sellerId: user.id,
            status: 'active',
        });

        return await this.inventoryRepository.save(record);
    }

    async getHistoryByProduct(productId: string, user: User): Promise<InventoryRecord[]> {
        return await this.inventoryRepository.find({
            where: { productId, sellerId: user.id },
            order: { createdAt: 'DESC' },
        });
    }
}
