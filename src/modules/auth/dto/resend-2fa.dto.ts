import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendTwoFactorDto {
  @IsEmail({}, { message: "Formato de email inválido" })
  @IsNotEmpty({ message: "El email es requerido" })
  email: string;
}