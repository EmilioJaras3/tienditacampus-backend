import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para actualizar perfil de usuario.
 * Solo campos editables por el usuario (sin email, password, role).
 */
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
}
