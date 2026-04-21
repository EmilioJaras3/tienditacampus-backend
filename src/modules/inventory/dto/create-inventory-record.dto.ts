import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
  IsOptional,
  IsDateString,
} from "class-validator";

export class CreateInventoryRecordDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsDateString()
  @IsOptional()
  recordDate?: string;
}