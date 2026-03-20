import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DailySale } from '../entities/daily-sale.entity';
import { SalesRepository } from '../repositories/sales.repository';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class CloseDayUseCase {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(user: User, wastes: { productId: string; waste: number; wasteReason?: 'expired' | 'damaged' | 'other' }[]): Promise<DailySale> {
    const dailySale = await this.salesRepository.findToday(user.id);
    if (!dailySale) throw new NotFoundException('No hay venta abierta hoy');
    if (dailySale.isClosed) throw new BadRequestException('El día ya está cerrado');

    for (const item of wastes) {
      const detail = dailySale.details.find(d => d.productId === item.productId);
      if (detail) {
        const waste = Number(item.waste);
        if (waste > detail.quantityPrepared) {
          throw new BadRequestException(`Merma (${waste}) no puede exceder preparado (${detail.quantityPrepared}) para ${detail.product.name}`);
        }

        detail.quantityLost = waste;
        detail.quantitySold = detail.quantityPrepared - waste;
        detail.wasteReason = item.wasteReason || null;
        detail.wasteCost = Number(detail.unitCost) * waste;

        // FIFO: Consumir las unidades vendidas del inventario
        const unitsSold = detail.quantitySold;
        if (unitsSold > 0) {
          await this.salesRepository.consumeInventory(item.productId, user.id, unitsSold);
        }
      }
    }

    dailySale.isClosed = true;
    const saved = await this.salesRepository.closeDay(dailySale);

    // Registro de Auditoría
    await this.auditService.log({
      action: 'CLOSE_DAY',
      userId: user.id,
      entityType: 'daily_sales',
      entityId: saved.id,
      description: `Cierre de venta realizado para la fecha ${saved.saleDate}`,
      metadata: { items_processed: wastes.length }
    });

    return saved;
  }
}
