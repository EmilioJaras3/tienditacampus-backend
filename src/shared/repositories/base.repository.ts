import { Repository, DeepPartial, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<T extends ObjectLiteral> {
    constructor(protected readonly repository: Repository<T>) {}

    async findById(id: any): Promise<T> {
        const record = await this.repository.findOne({ where: { id } as any });
        if (!record) {
            throw new NotFoundException(`Record with ID ${id} not found`);
        }
        return record;
    }

    async findAll(): Promise<T[]> {
        return await this.repository.find();
    }

    async save(data: DeepPartial<T>): Promise<T> {
        return await this.repository.save(data);
    }

    async delete(id: any): Promise<void> {
        const result = await this.repository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Record with ID ${id} not found`);
        }
    }
}
