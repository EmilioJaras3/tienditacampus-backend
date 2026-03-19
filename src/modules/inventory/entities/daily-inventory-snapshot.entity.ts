import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('daily_inventory_snapshots')
export class DailyInventorySnapshot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'seller_id' })
    sellerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'seller_id' })
    seller: User;

    @Column({ name: 'product_id' })
    productId: string;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'date', name: 'snapshot_date', default: () => 'CURRENT_DATE' })
    snapshotDate: string;

    @Column({ type: 'int', name: 'opening_stock' })
    openingStock: number;

    @Column({ type: 'int', default: 0, name: 'units_sold' })
    unitsSold: number;

    @Column({ type: 'int', default: 0, name: 'units_wasted' })
    unitsWasted: number;

    @Column({ type: 'int', default: 0, name: 'closing_stock' })
    closingStock: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'waste_value' })
    wasteValue: number;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        name: 'waste_percentage',
        generatedType: 'STORED',
        asExpression: 'CASE WHEN opening_stock > 0 THEN (units_wasted::NUMERIC / opening_stock) * 100 ELSE 0 END',
        insert: false,
        update: false,
    })
    wastePercentage: number;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
