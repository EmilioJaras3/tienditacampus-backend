import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Configuración TypeORM PostgreSQL.
 */
export const databaseConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST'),
    port: configService.get<number>('POSTGRES_PORT'),
    database: configService.get<string>('POSTGRES_DB'),
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    autoLoadEntities: true,
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl: configService.get<string>('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
});
