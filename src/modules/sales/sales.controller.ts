import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    UseGuards,
    Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrepareDailySaleDto } from './dto/prepare-daily-sale.dto';
import { TrackSaleDto } from './dto/track-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Get('today')
    async getToday(@Req() req: any) {
        const result = await this.salesService.findToday(req.user as User);
        return result || null;
    }

    @Post('prepare')
    prepareDay(@Body() prepareDto: PrepareDailySaleDto, @Req() req: any) {
        return this.salesService.prepareDay(prepareDto, req.user as User);
    }

    @Post('track')
    trackProduct(@Body() trackDto: TrackSaleDto, @Req() req: any) {
        return this.salesService.trackProduct(trackDto, req.user as User);
    }
    @Get('roi')
    getROI(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.salesService.getROI(req.user as User, startDate, endDate);
    }

    @Get('history')
    getHistory(@Req() req: any) {
        return this.salesService.getHistory(req.user as User);
    }

    @Get('prediction')
    getPrediction(@Req() req: any) {
        return this.salesService.getPrediction(req.user as User);
    }

    @Post('close-day')
    closeDay(@Body() body: { items: { productId: string; waste: number }[] }, @Req() req: any) {
        return this.salesService.closeDay(req.user as User, body.items);
    }
}
