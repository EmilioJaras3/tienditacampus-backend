import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Configuración de TypeORM para PostgreSQL.
 * Lee TODAS las credenciales desde variables de entorno.
 * NUNCA hardcodear valores de conexión aquí.
 */
export const databaseConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST', 'localhost'),
    port: configService.get<number>('POSTGRES_PORT', 5432),
    database: configService.get<string>('POSTGRES_DB', 'tienditacampus'),
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    autoLoadEntities: true,
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl: configService.get<string>('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
});
