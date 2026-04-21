import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { User } from "../users/entities/user.entity";
import { ForecastService } from "./forecast.service";

@Controller("forecast")
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get("demo/:productId/day/:dayOfWeek")
  async getDemoForecast(
    @Param("productId") productId: string,
    @Param("dayOfWeek", ParseIntPipe) dayOfWeek: number,
  ) {
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      throw new BadRequestException(
        "dayOfWeek invalido. Debe ser entre 1 (Lunes) y 7 (Domingo)",
      );
    }

    return this.forecastService.getForecast(productId, dayOfWeek);
  }

  @Get(":productId/day/:dayOfWeek")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin", "buyer")
  async getForecast(
    @Param("productId") productId: string,
    @Param("dayOfWeek", ParseIntPipe) dayOfWeek: number,
    @Req() req: { user: User },
  ) {
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      throw new BadRequestException(
        "dayOfWeek invalido. Debe ser entre 1 (Lunes) y 7 (Domingo)",
      );
    }

    const sellerId =
      req.user.role === "seller" || req.user.role === "admin"
        ? req.user.id
        : undefined;

    return this.forecastService.getForecast(productId, dayOfWeek, sellerId);
  }
}