import { IsDateString, IsOptional } from 'class-validator';

export class GetWeeklyReportsDto {
    @IsOptional()
    @IsDateString()
    startWeek?: string;

    @IsOptional()
    @IsDateString()
    endWeek?: string;
}
