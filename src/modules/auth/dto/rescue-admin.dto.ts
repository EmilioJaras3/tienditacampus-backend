import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RescueAdminDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    secret: string;
}
