import { IsNotEmpty, IsNumber, IsUUID, Min, IsOptional, IsDateString } from 'class-validator';

export class CreateInventoryRecordDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsNumber()
    @Min(0)
    unitCost: number; // Important to calculate total investment and track cost changes

    @IsDateString()
    @IsOptional()
    recordDate?: string;
}
