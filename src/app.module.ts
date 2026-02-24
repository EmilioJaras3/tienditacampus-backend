import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { databaseConfig } from './config/database.config';

// Módulos de negocio
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AuditModule } from './modules/audit/audit.module';
import { BenchmarkingModule } from './modules/benchmarking/benchmarking.module';
// import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './common/controllers/health.controller';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
    imports: [
        // Configuración centralizada
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            validationSchema,
        }),

        // ── Base de datos RELACIONAL (PostgreSQL) ────────────
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: databaseConfig,
        }),

        // ── Base de datos NO RELACIONAL (MongoDB) ────────────
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>(
                    'MONGO_URI',
                    'mongodb://mongodb:27017/tienditacampus_logs',
                ),
            }),
        }),

        // Módulos activos
        AuthModule,
        UsersModule,
        ProductsModule,
        InventoryModule,
        SalesModule,
        AuditModule,
        OrdersModule,
        BenchmarkingModule,

        // Módulos (descomentar conforme se implementen)
        // ReportsModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
