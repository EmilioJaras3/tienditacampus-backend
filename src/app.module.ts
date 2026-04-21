import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { configuration } from "./config/configuration";
import { validationSchema } from "./config/validation.schema";
import { databaseConfig } from "./config/database.config";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProductsModule } from "./modules/products/products.module";
import { SalesModule } from "./modules/sales/sales.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BenchmarkingModule } from "./modules/benchmarking/benchmarking.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { HealthController } from "./common/controllers/health.controller";
import { OrdersModule } from "./modules/orders/orders.module";
import { BreakEvenModule } from "./modules/break-even/break-even.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ForecastModule } from "./modules/forecast/forecast.module";
import { ExpirationModule } from "./modules/expiration/expiration.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [
    SharedModule,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"),
      serveRoot: "/uploads",
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    AuditModule,
    OrdersModule,
    BenchmarkingModule,
    ReportsModule,
    BreakEvenModule,
    DashboardModule,
    ForecastModule,
    ExpirationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}