import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'buyer_id' })
    buyerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'buyer_id' })
    buyer: User;

    @Column({ name: 'seller_id' })
    sellerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'seller_id' })
    seller: User;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
    totalAmount: number;

    @Column({ type: 'varchar', default: 'pending' })
    status: string; // 'pending', 'completed', 'cancelled'

    @Column({ type: 'text', nullable: true, name: 'delivery_message' })
    deliveryMessage: string | null;

    @OneToMany(() => OrderItem, (item: OrderItem) => item.order, { cascade: true })
    items: OrderItem[];

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
