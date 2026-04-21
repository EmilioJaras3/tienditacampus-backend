import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class VerifyTwoFactorDto {
  @IsEmail({}, { message: "Formato de email inválido" })
  @IsNotEmpty({ message: "El email es requerido" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "El código es requerido" })
  @Length(6, 6, { message: "El código debe tener 6 dígitos" })
  code: string;
}