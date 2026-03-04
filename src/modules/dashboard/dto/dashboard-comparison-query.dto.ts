import { IsDateString, IsOptional } from 'class-validator';

export class DashboardComparisonQueryDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
