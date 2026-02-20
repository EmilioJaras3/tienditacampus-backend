import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
    Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming JwtAuthGuard exists in auth module
import { User } from '../users/entities/user.entity';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get('marketplace')
    getMarketplace(@Query('q') q?: string, @Query('seller') sellerId?: string) {
        return this.productsService.findMarketplace(q, sellerId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
        return this.productsService.create(createProductDto, req.user as User);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() req: any) {
        return this.productsService.findAll(req.user as User);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.productsService.findOne(id, req.user as User);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @Req() req: any,
    ) {
        return this.productsService.update(id, updateProductDto, req.user as User);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string, @Req() req: any) {
        return this.productsService.remove(id, req.user as User);
    }
}
