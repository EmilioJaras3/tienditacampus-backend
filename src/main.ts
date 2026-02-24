import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';

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

    // CORS
    app.enableCors({
        origin: [
            configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:3000',
        ],
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    const port = configService.get<number>('BACKEND_PORT', 3001);
    await app.listen(port);

    console.log(`🚀 TienditaCampus API running on port ${port}`);
    console.log(`📡 Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
