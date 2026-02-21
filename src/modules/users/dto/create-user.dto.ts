import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    MaxLength,
    Matches,
} from 'class-validator';

/**
 * DTO para crear un usuario nuevo (registro).
 * class-validator valida automáticamente antes de llegar al controller.
 */
export class CreateUserDto {
    @IsEmail({}, { message: 'El email no tiene un formato válido' })
    @IsNotEmpty({ message: 'El email es requerido' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message:
            'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    })
    password: string;

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
    @IsIn(['seller', 'buyer'], { message: 'El rol debe ser seller o buyer' })
    role?: 'seller' | 'buyer';
}
