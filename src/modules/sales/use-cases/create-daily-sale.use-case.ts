import { Injectable, BadRequestException } from '@nestjs/common';
import { DailySale } from '../entities/daily-sale.entity';
import { SaleDetail } from '../entities/sale-detail.entity';
import { Product } from '../../products/entities/product.entity';
import { SalesRepository } from '../repositories/sales.repository';
import { PrepareDailySaleDto } from '../dto/prepare-daily-sale.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class CreateDailySaleUseCase {
  constructor(
    private readonly salesRepository: SalesRepository,
  ) {}

  async execute(prepareDto: PrepareDailySaleDto, user: User): Promise<DailySale> {
    const existing = await this.salesRepository.findToday(user.id);
    if (existing) {
      throw new BadRequestException('Daily sale already initialized for today. Use update methods instead.');
    }

    // Calculate Initial Investment
    let totalInvestment = 0;
    const details: SaleDetail[] = [];

    for (const item of prepareDto.items) {
      const product = await this.salesRepository.findProduct(item.productId);
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);

      const detail = new SaleDetail();
      detail.product = product;
      detail.productId = product.id;
      detail.quantityPrepared = item.quantityPrepared;
      detail.unitCost = product.unitCost;
      detail.unitPrice = product.salePrice;

      totalInvestment += Number(product.unitCost) * item.quantityPrepared;
      details.push(detail);
    }

    // Create Header
    const dailySale = new DailySale();
    dailySale.seller = user;
    dailySale.sellerId = user.id;
    dailySale.totalInvestment = totalInvestment;
    dailySale.saleDate = new Date().toISOString().split('T')[0];

    return await this.salesRepository.createDailySale(dailySale, details);
  }
}
