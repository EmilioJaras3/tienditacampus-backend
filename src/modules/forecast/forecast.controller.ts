import { Controller, Get, Param, ParseIntPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('forecast')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class ForecastController {
    constructor(private readonly forecastService: ForecastService) { }

    @Get(':productId/day/:dayOfWeek')
    async getForecast(
        @Param('productId') productId: string,
        @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    ) {
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new BadRequestException('dayOfWeek inválido. Debe ser entre 1 (Lunes) y 7 (Domingo)');
        }

        const recommendedQuantity = await this.forecastService.getForecast(productId, dayOfWeek);

        return {
            productId,
            dayOfWeek,
            recommendedQuantity
        };
    }
}
