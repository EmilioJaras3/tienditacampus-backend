import { IsArray, ValidateNested, IsUUID, IsNotEmpty, IsNumber, Min, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseDayItemDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(0)
    waste: number;

    @IsOptional()
    @IsIn(['expired', 'damaged', 'other'])
    wasteReason?: 'expired' | 'damaged' | 'other';
}

export class CloseDayDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CloseDayItemDto)
    items: CloseDayItemDto[];
}
