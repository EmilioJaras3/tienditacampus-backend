import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';

function getAllowedOrigins(configService: ConfigService): string[] {
    const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost');
    return frontendUrl
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Aumentar el límite de tamaño para JSON (Base64 images)
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    const configService = app.get(ConfigService);

    // Prefijo global para la API
    app.setGlobalPrefix('api');

    // Validación global de DTOs
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const allowedOrigins = getAllowedOrigins(configService);

    // CORS
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    const port = configService.get<number>('BACKEND_PORT', 3001);
    await app.listen(port);

    console.log(`TienditaCampus API running on port ${port}`);
    console.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
