import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';


@Injectable()
export class AuditService {
    constructor(
        @InjectModel(AuditLog.name)
        private readonly auditModel: Model<AuditLog>,
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
            const entry = new this.auditModel({
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                userId: params.userId,
                metadata: params.metadata || {},
                level: params.level || 'info',
                description: params.description,
                ipAddress: params.ipAddress,
            });
            return await entry.save();
        } catch (error) {
            console.error('Audit log failed (MongoDB not connected):', error.message);
            return null;
        }
    }

    async findByAction(action: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ action })
            .sort({ created_at: -1 })
            .limit(100)
            .exec();
    }

    async findByUser(userId: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ userId })
            .sort({ created_at: -1 })
            .limit(100)
            .exec();
    }

    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ entityType, entityId })
            .sort({ created_at: -1 })
            .limit(50)
            .exec();
    }

    async findByMetadataKey(key: string, value: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ [`metadata.${key}`]: value })
            .sort({ created_at: -1 })
            .limit(50)
            .exec();
    }

    async getRecent(limit = 50): Promise<AuditLog[]> {
        return this.auditModel
            .find()
            .sort({ created_at: -1 })
            .limit(limit)
            .exec();
    }
}
