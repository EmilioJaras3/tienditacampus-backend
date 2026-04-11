import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

/**
 * DTO para registro de usuario nuevo.
 */
export class RegisterDto {
    @IsEmail({}, { message: 'El email no tiene un formato válido' })
    @IsNotEmpty({ message: 'El email es requerido' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
        message:
            'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
    })
    password: string;

    @IsNotEmpty({ message: 'Debes aceptar los términos y condiciones' })
    @IsIn([true], { message: 'Debes aceptar los términos y condiciones' })
    acceptTerms: boolean;

    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100)
    firstName: string;

    @IsString()
    @IsNotEmpty({ message: 'Los apellidos son requeridos' })
    @MaxLength(100)
    lastName: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    major?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    campusLocation?: string;

    /**
     * Rol del usuario. Solo se permite 'seller' o 'buyer'.
     * El administrador no puede auto-asignarse el rol 'admin'.
     * Si no se envía, la entidad User asignará 'seller' por defecto.
     */
    @IsOptional()
    @IsIn(['seller', 'buyer'], { message: 'El rol debe ser seller o buyer' })
    role?: 'seller' | 'buyer';

    @IsOptional()
    @IsBoolean()
    acceptTerms?: boolean;
}
