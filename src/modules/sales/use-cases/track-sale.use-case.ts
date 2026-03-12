import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesRepository } from '../repositories/sales.repository';
import { TrackSaleDto } from '../dto/track-sale.dto';
import { User } from '../../users/entities/user.entity';
import { SaleDetail } from '../entities/sale-detail.entity';

@Injectable()
export class TrackSaleUseCase {
  constructor(private readonly salesRepository: SalesRepository) {}

  async execute(trackDto: TrackSaleDto, user: User): Promise<any> {
    const dailySale = await this.salesRepository.findToday(user.id);
    if (!dailySale) {
      throw new NotFoundException('No active daily sale found for today. Please initialize the day first.');
    }

    const detail = dailySale.details.find(d => d.productId === trackDto.productId);
    if (!detail) {
      throw new NotFoundException('Product not found in today\'s records');
    }

    // Validate
    if (detail.quantityPrepared < (trackDto.quantitySold + trackDto.quantityLost)) {
      throw new BadRequestException('Cannot sell/lose more than prepared quantity');
    }

    // Update Detail
    detail.quantitySold = trackDto.quantitySold;
    detail.quantityLost = trackDto.quantityLost;
    await this.salesRepository.saveSaleDetail(detail);

    // Recalculate Header
    return await this.recalculateHeader(dailySale.id);
  }

  private async recalculateHeader(dailySaleId: string): Promise<any> {
    const sale = await this.salesRepository.findSaleWithDetails(dailySaleId);

    if (!sale) throw new NotFoundException('Sale not found');

    let totalRevenue = 0;
    let unitsSold = 0;
    let unitsLost = 0;
    let totalWasteCost = 0;

    for (const detail of sale.details) {
      totalRevenue += Number(detail.unitPrice) * detail.quantitySold;
      unitsSold += detail.quantitySold;
      unitsLost += detail.quantityLost;
      totalWasteCost += Number(detail.wasteCost || 0);
    }

    sale.totalRevenue = totalRevenue;
    sale.unitsSold = unitsSold;
    sale.unitsLost = unitsLost;
    sale.totalWasteCost = totalWasteCost;

    const profit = totalRevenue - Number(sale.totalInvestment);
    sale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Calculate break_even_units
    if (sale.unitsSold > 0) {
      const avgSalePrice = totalRevenue / sale.unitsSold;
      const unitsPrepared = sale.unitsSold + sale.unitsLost;
      const avgUnitCost = unitsPrepared > 0 ? Number(sale.totalInvestment) / unitsPrepared : 0;

      const wasteRate = unitsPrepared > 0 ? sale.unitsLost / unitsPrepared : 0;
      const effectiveUnitCost = avgUnitCost * (1 + wasteRate);
      const unitMargin = avgSalePrice - effectiveUnitCost;

      if (unitMargin > 0) {
        sale.breakEvenUnits = Number((Number(sale.totalInvestment) / unitMargin).toFixed(2));
      } else {
        sale.breakEvenUnits = null;
      }
    } else {
      sale.breakEvenUnits = null;
    }

    await this.salesRepository.updateSale(sale.id, {
      totalRevenue: sale.totalRevenue,
      unitsSold: sale.unitsSold,
      unitsLost: sale.unitsLost,
      totalWasteCost: sale.totalWasteCost,
      profitMargin: sale.profitMargin,
      breakEvenUnits: sale.breakEvenUnits
    });

    return sale;
  }
}
