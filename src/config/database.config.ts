import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Configuración de TypeORM para PostgreSQL.
 * Lee TODAS las credenciales desde variables de entorno.
 * NUNCA hardcodear valores de conexión aquí.
 */
export const databaseConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => {
    const url = configService.get<string>('database.url') || process.env.DATABASE_URL;

    if (url) {
        return {
            type: 'postgres',
            url,
            autoLoadEntities: true,
            synchronize: configService.get<boolean>('POSTGRES_SYNCHRONIZE', false),
            logging: configService.get<string>('NODE_ENV') === 'development',
            ssl: { rejectUnauthorized: false },
        };
    }

    return {
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        database: configService.get<string>('POSTGRES_DB', 'tienditacampus'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: configService.get<boolean>('POSTGRES_SSL', false) ? { rejectUnauthorized: false } : false,
    };
};
