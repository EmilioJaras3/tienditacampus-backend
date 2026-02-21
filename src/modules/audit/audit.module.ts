import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * AuditModule — Módulo global de auditoría con MongoDB (NoSQL).
 *
 * Este módulo se conecta a MongoDB (base de datos no relacional)
 * para almacenar logs, mientras que el resto de la app usa
 * PostgreSQL (base de datos relacional).
 *
 * Al ser @Global(), el AuditService puede inyectarse
 * en cualquier otro módulo sin necesidad de importar AuditModule.
 */
@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AuditLog.name, schema: AuditLogSchema },
        ]),
    ],
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
