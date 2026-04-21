import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UsersService } from "./modules/users/users.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const password = "IsaacMD78";

  try {
    const tempUser = await usersService.create({
      email: "temphash@test.com",
      password: password,
      firstName: "Temp",
      lastName: "Hash",
      role: "buyer",
    });
    console.log("=== NEW HASH CREATED ===");
    console.log(tempUser.passwordHash);

    await app
      .get("DataSource")
      .query(
        `UPDATE users SET password_hash = $1 WHERE email IN ('jarassanchezl@gmail.com')`,
        [tempUser.passwordHash],
      );

    await app
      .get("DataSource")
      .query(`DELETE FROM users WHERE email = 'temphash@test.com'`);

    console.log("=== UPDATED SUCCESSFULLY ===");
  } catch (e) {
    console.error(e);
  }

  await app.close();
}
bootstrap();