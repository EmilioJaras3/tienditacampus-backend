import { IsNotEmpty, IsUUID, IsArray, ValidateNested, ArrayMinSize, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    @IsNotEmpty()
    @IsUUID()
    sellerId: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];
}
