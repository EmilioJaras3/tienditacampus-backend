import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class TrackSaleDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(0)
    quantitySold: number;

    @IsNumber()
    @Min(0)
    quantityLost: number;
}
