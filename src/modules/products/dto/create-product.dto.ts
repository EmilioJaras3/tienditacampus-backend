import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, IsUrl } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    unitCost: number;

    @IsNumber()
    @Min(0)
    salePrice: number;

    @IsBoolean()
    @IsOptional()
    isPerishable?: boolean;

    @IsNumber()
    @IsOptional()
    @Min(0)
    shelfLifeDays?: number;

    @IsString()
    @IsOptional()
    @IsUrl()
    imageUrl?: string;
}
