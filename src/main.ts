import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
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
