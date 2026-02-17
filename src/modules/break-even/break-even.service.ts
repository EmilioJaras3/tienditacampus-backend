import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CalculateBreakEvenDto } from './dto/calculate-break-even.dto';

@Injectable()
export class BreakEvenService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Calcula el Break-Even ajustado por tasa histórica de merma.
     *
     * Fórmula mejorada:
     *   costoEfectivo = unitCost × (1 + tasaDeMerma)
     *   breakEven     = fixedCosts / (unitPrice - costoEfectivo)
     *
     * tasaDeMerma se obtiene de los últimos 30 días de sale_details:
     *   tasa = SUM(quantity_lost) / SUM(quantity_sold + quantity_lost)
     *   Si no hay datos → tasa = 0
     */
    async calculate(dto: CalculateBreakEvenDto, user: User) {
        const product = await this.productRepository.findOne({
            where: {
                id: dto.productId,
                sellerId: user.id,
                isActive: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado para el vendedor autenticado');
        }

        // ── Obtener tasa histórica de merma (últimos 30 días, una sola query) ──
        const wasteRateResult = await this.dataSource.query(
            `SELECT
                COALESCE(SUM(sd.quantity_lost), 0)::int AS total_lost,
                COALESCE(SUM(sd.quantity_sold + sd.quantity_lost), 0)::int AS total_handled
            FROM sale_details sd
            INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
            WHERE sd.product_id = $1
              AND ds.seller_id = $2
              AND ds.sale_date >= (CURRENT_DATE - INTERVAL '30 days')`,
            [dto.productId, user.id],
        );

        const totalLost = Number(wasteRateResult[0]?.total_lost || 0);
        const totalHandled = Number(wasteRateResult[0]?.total_handled || 0);
        const wasteRate = totalHandled > 0 ? totalLost / totalHandled : 0;

        // ── Cálculo con BigInt para precisión ──
        const rawUnitCost = Number(dto.unitCost ?? product.unitCost);
        const effectiveUnitCost = rawUnitCost * (1 + wasteRate);

        const unitCostCents = this.toCents(effectiveUnitCost);
        const unitPriceCents = this.toCents(dto.unitPrice ?? product.salePrice);
        const fixedCostsCents = this.toCents(dto.fixedCosts);

        const marginCents = unitPriceCents - unitCostCents;
        if (marginCents <= 0n) {
            throw new BadRequestException(
                'Margen unitario no positivo después de ajustar por merma: ' +
                'el precio debe cubrir el costo efectivo (costo × (1 + tasa_merma))'
            );
        }

        const breakEvenUnits = this.ceilDiv(fixedCostsCents, marginCents);

        return {
            productId: product.id,
            productName: product.name,
            fixedCosts: this.fromCents(fixedCostsCents),
            unitCost: this.fromCents(this.toCents(rawUnitCost)),
            effectiveUnitCost: this.fromCents(unitCostCents),
            unitPrice: this.fromCents(unitPriceCents),
            unitMargin: this.fromCents(marginCents),
            wasteRate: Number((wasteRate * 100).toFixed(2)),
            wasteRateSample: { totalLost, totalHandled, periodDays: 30 },
            breakEvenUnits,
            formula: 'break_even = fixed_costs / (unit_price - unit_cost × (1 + waste_rate))',
        };
    }

    private toCents(value: number | string): bigint {
        const normalized = Number(value).toFixed(2);
        const [intPart, decimalPart] = normalized.split('.');
        return BigInt(`${intPart}${decimalPart}`);
    }

    private fromCents(value: bigint): string {
        const sign = value < 0n ? '-' : '';
        const abs = value < 0n ? -value : value;
        const base = abs.toString().padStart(3, '0');
        const intPart = base.slice(0, -2);
        const decPart = base.slice(-2);
        return `${sign}${intPart}.${decPart}`;
    }

    private ceilDiv(numerator: bigint, denominator: bigint): number {
        const result = (numerator + denominator - 1n) / denominator;
        return Number(result);
    }
}
