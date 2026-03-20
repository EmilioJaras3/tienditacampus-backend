import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditRepository: Repository<AuditLog>,
    ) { }

    async log(params: {
        action: string;
        entityType?: string;
        entityId?: string;
        userId?: string;
        metadata?: Record<string, any>;
        level?: 'info' | 'warn' | 'error' | 'debug';
        description?: string;
        ipAddress?: string;
    }): Promise<AuditLog | null> {
        try {
            const entry = this.auditRepository.create({
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                userId: params.userId,
                metadata: params.metadata || {},
                level: params.level || 'info',
                description: params.description,
                ipAddress: params.ipAddress,
            });
            return await this.auditRepository.save(entry);
        } catch (error) {
            console.error('Audit log failed (PostgreSQL):', error.message);
            return null;
        }
    }

    async findByAction(action: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { action },
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    async findByUser(userId: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }

    async findByMetadataKey(key: string, value: string): Promise<AuditLog[]> {
        // Para JSONB en PostgreSQL usamos query builder o parámetros de búsqueda crudos si es complejo, 
        // pero para llaves directas podemos usar la sintaxis de TypeORM
        return this.auditRepository
            .createQueryBuilder('audit')
            .where(`audit.metadata->>'${key}' = :value`, { value })
            .orderBy('audit.createdAt', 'DESC')
            .take(50)
            .getMany();
    }

    async getRecent(limit = 50): Promise<AuditLog[]> {
        return this.auditRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    async findAll(): Promise<AuditLog[]> {
        return this.auditRepository.find({
            order: { createdAt: 'DESC' },
            take: 100
        });
    }
}
