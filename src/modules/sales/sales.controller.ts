import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { SalesService } from "./sales.service";
import { PrepareDailySaleDto } from "./dto/prepare-daily-sale.dto";
import { TrackSaleDto } from "./dto/track-sale.dto";
import { CloseDayDto } from "./dto/close-day.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { BusinessHoursGuard } from "../../common/guards/business-hours.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../users/entities/user.entity";

@Controller("sales")
@UseGuards(JwtAuthGuard, RolesGuard, BusinessHoursGuard)
@Roles("seller", "admin")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get("today")
  async getToday(@Req() req: any) {
    const result = await this.salesService.findToday(req.user as User);
    return result || null;
  }

  @Post("prepare")
  prepareDay(@Body() prepareDto: PrepareDailySaleDto, @Req() req: any) {
    return this.salesService.prepareDay(prepareDto, req.user as User);
  }

  @Post("track")
  trackProduct(@Body() trackDto: TrackSaleDto, @Req() req: any) {
    return this.salesService.trackProduct(trackDto, req.user as User);
  }

  @Get("roi")
  getROI(@Req() req: any) {
    return this.salesService.getROI(req.user as User);
  }

  @Get("history")
  getHistory(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.salesService.getHistory(
      req.user as User,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get("analytics/by-weekday")
  getByWeekdayAnalytics(@Req() req: any) {
    return this.salesService.getByWeekdayAnalytics(req.user as User);
  }

  @Get("prediction")
  @Roles("seller", "admin", "buyer")
  getPrediction(@Req() req: any) {
    return this.salesService.getPrediction(req.user as User);
  }

  @Post("close-day")
  closeDay(@Body() dto: CloseDayDto, @Req() req: any) {
    return this.salesService.closeDay(req.user as User, dto.items);
  }
}