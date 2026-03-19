import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryRecordDto } from './dto/create-inventory-record.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';

/**
 * InventoryController — Solo accesible para sellers y admins.
 */
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post()
    addStock(@Body() createInventoryDto: CreateInventoryRecordDto, @Req() req: any) {
        return this.inventoryService.addStock(createInventoryDto, req.user as User);
    }

    @Get('product/:id')
    getHistory(@Param('id') productId: string, @Req() req: any) {
        return this.inventoryService.getHistoryByProduct(productId, req.user as User);
    }
}
