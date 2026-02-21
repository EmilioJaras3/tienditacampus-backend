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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    /**
     * GET /products/marketplace
     * Endpoint público — cualquier usuario (autenticado o no) puede ver el catálogo.
     */
    @Get('marketplace')
    getMarketplace(@Query('q') q?: string, @Query('seller') sellerId?: string) {
        return this.productsService.findMarketplace(q, sellerId);
    }

    /**
     * POST /products — Solo vendedores y admins pueden crear productos.
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('seller', 'admin')
    create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
        return this.productsService.create(createProductDto, req.user as User);
    }

    /**
     * GET /products — Listado del catálogo del vendedor autenticado.
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('seller', 'admin')
    findAll(@Req() req: any) {
        return this.productsService.findAll(req.user as User);
    }

    /**
     * GET /products/:id — Detalle de un producto del vendedor.
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('seller', 'admin')
    findOne(@Param('id') id: string, @Req() req: any) {
        return this.productsService.findOne(id, req.user as User);
    }

    /**
     * PATCH /products/:id — Actualizar producto del vendedor.
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('seller', 'admin')
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @Req() req: any,
    ) {
        return this.productsService.update(id, updateProductDto, req.user as User);
    }

    /**
     * DELETE /products/:id — Eliminar producto del vendedor.
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('seller', 'admin')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.productsService.remove(id, req.user as User);
    }
}
