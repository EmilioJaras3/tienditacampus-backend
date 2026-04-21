import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { User } from "../users/entities/user.entity";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("purchase")
  @Roles("buyer", "seller", "admin")
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.createOrder(createOrderDto, req.user as User);
  }

  @Get("my-purchases")
  @Roles("buyer", "seller", "admin")
  async getBuyerPurchases(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.ordersService.getBuyerPurchases(
      req.user as User,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get("seller-sales")
  @Roles("seller", "admin")
  async getSellerSales(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.ordersService.getSellerSales(
      req.user as User,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Patch(":id/accept")
  @Roles("seller", "admin")
  async acceptOrder(@Param("id") id: string, @Req() req: any) {
    return this.ordersService.acceptOrder(id, req.user as User);
  }

  @Patch(":id/reject")
  @Roles("seller", "admin")
  async rejectOrder(@Param("id") id: string, @Req() req: any) {
    return this.ordersService.rejectOrder(id, req.user as User);
  }

  @Patch(":id/deliver")
  @Roles("buyer", "seller", "admin")
  async deliverOrder(@Param("id") id: string, @Req() req: any) {
    return this.ordersService.deliverOrder(id, req.user as User);
  }
}