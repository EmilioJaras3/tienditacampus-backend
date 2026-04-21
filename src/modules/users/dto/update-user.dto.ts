import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
  @IsOptional()
  @IsString()
  @MaxLength(6)
  twoFactorCode?: string | null;

  @IsOptional()
  twoFactorExpires?: Date | null;
}