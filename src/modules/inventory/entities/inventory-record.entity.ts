import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('inventory_records')
export class InventoryRecord {
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

    @Column({ type: 'date', name: 'record_date', default: () => 'CURRENT_DATE' })
    recordDate: string;

    @Column({ type: 'int', name: 'quantity_initial' })
    quantityInitial: number;

    @Column({ type: 'int', default: 0, name: 'quantity_remaining' })
    quantityRemaining: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'investment_amount' })
    investmentAmount: number;

    @Column({
        type: 'enum',
        enum: ['active', 'sold_out', 'expired', 'closed'],
        default: 'active',
    })
    status: 'active' | 'sold_out' | 'expired' | 'closed';

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
