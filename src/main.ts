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
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    const configService = app.get(ConfigService);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const allowedOrigins = getAllowedOrigins(configService);

    app.enableCors({
        origin: true, 
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        optionsSuccessStatus: 204,
    });

    const port = configService.get<number>('PORT') || configService.get<number>('BACKEND_PORT', 3001);
    await app.listen(port);

    console.log(`TienditaCampus API running on port ${port}`);
    console.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
}

bootstrap();
