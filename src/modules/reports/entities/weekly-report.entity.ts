import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('weekly_reports')
export class WeeklyReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'seller_id' })
    sellerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'seller_id' })
    seller: User;

    @Column({ type: 'date', name: 'week_start' })
    weekStart: string;

    @Column({ type: 'date', name: 'week_end' })
    weekEnd: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_investment', default: 0 })
    totalInvestment: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_revenue', default: 0 })
    totalRevenue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_profit', default: 0 })
    totalProfit: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, name: 'avg_profit_margin', default: 0 })
    avgProfitMargin: number;

    @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, name: 'total_waste_cost' })
    totalWasteCost: number;

    @Column({ type: 'int', name: 'total_units_sold', default: 0 })
    totalUnitsSold: number;

    @Column({ type: 'int', name: 'total_units_lost', default: 0 })
    totalUnitsLost: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, name: 'loss_percentage', default: 0 })
    lossPercentage: number;

    @Column({ type: 'uuid', name: 'best_selling_product', nullable: true })
    bestSellingProductId: string | null;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'best_selling_product' })
    bestSellingProduct: Product | null;

    @Column({ type: 'jsonb', name: 'demand_prediction', nullable: true })
    demandPrediction: unknown;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
