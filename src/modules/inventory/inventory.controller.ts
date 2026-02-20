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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
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
