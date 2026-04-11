const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { UsersService } = require('./dist/modules/users/users.service');

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    
    const email = 'admin@campus.edu'.toLowerCase();
    const password = 'Pass1234!';
    
    try {
        await usersService.create({
            email,
            password,
            firstName: 'Admin',
            lastName: 'Dashboard',
            role: 'admin'
        });
        console.log('SUCCESS: User created');
    } catch (e) {
        console.log('NOTICE: User might already exist', e.message);
        // If it exists, update it or just ignore
    }
    
    await app.close();
}

bootstrap();
