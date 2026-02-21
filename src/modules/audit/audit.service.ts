import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

/**
 * AuditService — Servicio de auditoría usando MongoDB (NoSQL).
 *
 * Este servicio se conecta a MongoDB (base de datos NO relacional)
 * para almacenar logs de actividad como documentos JSON flexibles.
 *
 * Diferencia clave vs PostgreSQL:
 *   - PostgreSQL: tablas con columnas fijas, relaciones, JOINs
 *   - MongoDB: documentos JSON sin esquema fijo, cada documento puede ser diferente
 */
@Injectable()
export class AuditService {
    constructor(
        @InjectModel(AuditLog.name)
        private readonly auditModel: Model<AuditLog>,
    ) { }

    /**
     * Registra un evento de auditoría en MongoDB.
     * El campo `metadata` puede contener cualquier estructura JSON.
     */
    async log(params: {
        action: string;
        entityType?: string;
        entityId?: string;
        userId?: string;
        metadata?: Record<string, any>;
        level?: 'info' | 'warn' | 'error' | 'debug';
        description?: string;
        ipAddress?: string;
    }): Promise<AuditLog> {
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
        return entry.save();
    }

    /**
     * Busca logs por acción.
     */
    async findByAction(action: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ action })
            .sort({ created_at: -1 })
            .limit(100)
            .exec();
    }

    /**
     * Busca logs de un usuario específico.
     */
    async findByUser(userId: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ userId })
            .sort({ created_at: -1 })
            .limit(100)
            .exec();
    }

    /**
     * Busca logs de una entidad específica.
     */
    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ entityType, entityId })
            .sort({ created_at: -1 })
            .limit(50)
            .exec();
    }

    /**
     * ════════════════════════════════════════════
     *  Consulta NoSQL — Buscar dentro del JSON
     * ════════════════════════════════════════════
     *
     * En MongoDB, buscar dentro de documentos anidados
     * es nativo. No necesitas operadores especiales como
     * en PostgreSQL (->>, @>). Simplemente usas dot notation.
     */
    async findByMetadataKey(key: string, value: string): Promise<AuditLog[]> {
        return this.auditModel
            .find({ [`metadata.${key}`]: value })
            .sort({ created_at: -1 })
            .limit(50)
            .exec();
    }

    /**
     * Obtiene los últimos N logs del sistema.
     */
    async getRecent(limit = 50): Promise<AuditLog[]> {
        return this.auditModel
            .find()
            .sort({ created_at: -1 })
            .limit(limit)
            .exec();
    }
}
