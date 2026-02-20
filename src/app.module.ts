import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { databaseConfig } from './config/database.config';

// Módulos de negocio
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { InventoryModule } from './modules/inventory/inventory.module';
// import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './common/controllers/health.controller';

@Module({
    imports: [
        // Configuración centralizada
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            validationSchema,
        }),

        // Base de datos
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: databaseConfig,
        }),

        // Módulos activos
        AuthModule,
        UsersModule,
        ProductsModule,
        InventoryModule,
        SalesModule,

        // Módulos (descomentar conforme se implementen)
        // ReportsModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
