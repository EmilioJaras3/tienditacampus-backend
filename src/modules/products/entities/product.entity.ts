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

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'seller_id' })
    sellerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'seller_id' })
    seller: User;

    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost' })
    unitCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'sale_price' })
    salePrice: number;

    @Column({ type: 'boolean', default: false, name: 'is_perishable' })
    isPerishable: boolean;

    @Column({ type: 'int', nullable: true, name: 'shelf_life_days' })
    shelfLifeDays: number;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
    imageUrl: string;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
