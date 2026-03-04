import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CalculateBreakEvenDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(0)
    fixedCosts: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    unitCost?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    unitPrice?: number;
}
