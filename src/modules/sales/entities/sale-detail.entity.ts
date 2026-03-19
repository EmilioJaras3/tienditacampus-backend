import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { DailySale } from './daily-sale.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('sale_details')
export class SaleDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'daily_sale_id' })
    dailySaleId: string;

    @ManyToOne(() => DailySale, (dailySale) => dailySale.details, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'daily_sale_id' })
    dailySale: DailySale;

    @Column({ name: 'product_id' })
    productId: string;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'int', name: 'quantity_prepared' })
    quantityPrepared: number;

    @Column({ type: 'int', default: 0, name: 'quantity_sold' })
    quantitySold: number;

    @Column({ type: 'int', default: 0, name: 'quantity_lost' })
    quantityLost: number;

    @Column({
        type: 'enum',
        enumName: 'waste_reason_type',
        enum: ['expired', 'damaged', 'other'],
        nullable: true,
        name: 'waste_reason',
        comment: 'Causalidad de la merma: vencimiento, daño físico u otro',
    })
    wasteReason: 'expired' | 'damaged' | 'other' | null;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
        name: 'waste_cost',
        comment: 'Costo económico real de la merma (quantity_lost * unit_cost)',
    })
    wasteCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost' })
    unitCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
    unitPrice: number;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        generatedType: 'STORED',
        asExpression: 'quantity_sold * unit_price',
        insert: false,
        update: false,
    })
    subtotal: number;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
