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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../users/entities/user.entity";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("marketplace")
  getMarketplace(
    @Query("q") q?: string,
    @Query("seller") sellerId?: string,
    @Query("category") category?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.productsService.findMarketplace(
      q,
      sellerId,
      category,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get("marketplace/:id")
  findOneMarketplace(@Param("id") id: string) {
    return this.productsService.findOneMarketplace(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin")
  create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    return this.productsService.create(createProductDto, req.user as User);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin")
  findAll(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.productsService.findAll(
      req.user as User,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.productsService.findOne(id, req.user as User);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin")
  update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: any,
  ) {
    return this.productsService.update(id, updateProductDto, req.user as User);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("seller", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @Req() req: any) {
    return this.productsService.remove(id, req.user as User);
  }
}