import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * AuditLog — Documento de MongoDB (Base de datos NoSQL).
 *
 * A diferencia de las entidades de TypeORM (PostgreSQL),
 * este schema usa Mongoose y se almacena en MongoDB como
 * un documento JSON flexible.
 *
 * PostgreSQL (relacional) → usuarios, productos, ventas
 * MongoDB (no relacional) → logs de auditoría, analytics
 */
@Schema({
    collection: 'audit_logs',
    timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class AuditLog extends Document {
    /**
     * Acción realizada.
     * Ejemplos: 'user.login', 'product.create', 'sale.close'
     */
    @Prop({ required: true, index: true })
    action: string;

    /**
     * Tipo de entidad afectada.
     */
    @Prop({ index: true })
    entityType: string;

    /**
     * ID de la entidad afectada.
     */
    @Prop()
    entityId: string;

    /**
     * ID del usuario que realizó la acción.
     */
    @Prop({ index: true })
    userId: string;

    /**
     * ════════════════════════════════════════════
     *  METADATA — Documento JSON flexible (NoSQL)
     * ════════════════════════════════════════════
     *
     * Este campo puede contener CUALQUIER estructura.
     * Cada log puede tener datos completamente diferentes.
     * Esto es lo que hace a MongoDB "no relacional".
     *
     * Ejemplo login:
     *   { email: "user@mail.com", loginCount: 5, browser: "Chrome" }
     *
     * Ejemplo venta:
     *   { items: [...], total: 450.00, paymentMethod: "cash" }
     *
     * Ejemplo error:
     *   { stack: "Error at...", request: { method: "POST", url: "/api/..." } }
     */
    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;

    /**
     * Nivel de severidad.
     */
    @Prop({ default: 'info', enum: ['info', 'warn', 'error', 'debug'] })
    level: string;

    /**
     * Descripción legible del evento.
     */
    @Prop()
    description: string;

    /**
     * IP del cliente.
     */
    @Prop()
    ipAddress: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Índice compuesto para búsquedas por entidad
AuditLogSchema.index({ entityType: 1, entityId: 1 });
