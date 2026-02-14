import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
    @IsString()
    @IsNotEmpty({ message: 'El token de Google es requerido' })
    token: string;
}
