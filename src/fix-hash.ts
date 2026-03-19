import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    // Create a new valid hash through the service method
    const password = 'IsaacMD78';

    // We will trick it by creating a dummy user to catch the exact hash
    try {
        const tempUser = await usersService.create({
            email: 'temphash@test.com',
            password: password,
            firstName: 'Temp',
            lastName: 'Hash',
            role: 'buyer'
        });
        console.log("=== NEW HASH CREATED ===");
        console.log(tempUser.passwordHash);

        // Optional: save it to jarassanchezl@gmail.com
        await app.get('DataSource').query(
            `UPDATE users SET password_hash = $1 WHERE email IN ('jarassanchezl@gmail.com')`,
            [tempUser.passwordHash]
        );
        // Clean up
        await app.get('DataSource').query(`DELETE FROM users WHERE email = 'temphash@test.com'`);

        console.log("=== UPDATED SUCCESSFULLY ===");
    } catch (e) {
        console.error(e);
    }

    await app.close();
}
bootstrap();
