import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ForecastService } from './forecast.service';

@Controller('forecast')
export class ForecastController {
    constructor(private readonly forecastService: ForecastService) { }

    @Get(':productId/day/:dayOfWeek')
    async getForecast(
        @Param('productId') productId: string,
        @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    ) {
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            return { error: 'Invalid dayOfWeek. Must be between 1 (Monday) and 7 (Sunday)' };
        }

        const recommendedQuantity = await this.forecastService.getForecast(productId, dayOfWeek);

        return {
            productId,
            dayOfWeek,
            recommendedQuantity
        };
    }
}
