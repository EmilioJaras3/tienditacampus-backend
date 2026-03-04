import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CalculateBreakEvenDto } from './dto/calculate-break-even.dto';

@Injectable()
export class BreakEvenService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

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

        const unitCostCents = this.toCents(dto.unitCost ?? product.unitCost);
        const unitPriceCents = this.toCents(dto.unitPrice ?? product.salePrice);
        const fixedCostsCents = this.toCents(dto.fixedCosts);

        const marginCents = unitPriceCents - unitCostCents;
        if (marginCents <= 0n) {
            throw new BadRequestException('Margen unitario no positivo: el precio debe ser mayor al costo');
        }

        const breakEvenUnits = this.ceilDiv(fixedCostsCents, marginCents);

        return {
            productId: product.id,
            productName: product.name,
            fixedCosts: this.fromCents(fixedCostsCents),
            unitCost: this.fromCents(unitCostCents),
            unitPrice: this.fromCents(unitPriceCents),
            unitMargin: this.fromCents(marginCents),
            breakEvenUnits,
            formula: 'break_even_units = fixed_costs / (unit_price - unit_cost)',
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
