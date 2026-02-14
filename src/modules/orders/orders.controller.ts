import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('purchase')
    @Roles('buyer', 'seller', 'admin') // Anyone can buy
    async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
        return this.ordersService.createOrder(createOrderDto, req.user as User);
    }

    @Get('my-purchases')
    @Roles('buyer', 'seller', 'admin')
    async getBuyerPurchases(@Req() req: any) {
        return this.ordersService.getBuyerPurchases(req.user as User);
    }

    @Get('seller-sales')
    @Roles('seller', 'admin')
    async getSellerSales(@Req() req: any) {
        return this.ordersService.getSellerSales(req.user as User);
    }

    @Post(':id/accept')
    @Roles('seller', 'admin')
    async acceptOrder(@Req() req: any) {
        return this.ordersService.acceptOrder(req.params.id, req.user as User);
    }

    @Post(':id/reject')
    @Roles('seller', 'admin')
    async rejectOrder(@Req() req: any) {
        return this.ordersService.rejectOrder(req.params.id, req.user as User);
    }

    @Post(':id/deliver')
    @Roles('buyer', 'seller', 'admin')
    async deliverOrder(@Req() req: any, @Body() body: any) {
        // We use Post to make it simpler, but acting as Patch
        return this.ordersService.deliverOrder(req.params.id, req.user as User);
    }
}
