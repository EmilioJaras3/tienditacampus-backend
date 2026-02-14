import { IsArray, IsNotEmpty, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrepareDailySaleItemDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantityPrepared: number;
}

export class PrepareDailySaleDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PrepareDailySaleItemDto)
    items: PrepareDailySaleItemDto[];
}
