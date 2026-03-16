import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { Query } from './query.entity';

export enum IndexStrategy {
    NO_INDEX = 'NO_INDEX',
    SINGLE_INDEX = 'SINGLE_INDEX',
    COMPOSITE_INDEX = 'COMPOSITE_INDEX',
}

@Entity('executions')
export class Execution {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    execution_id: string;

    @Column({ name: 'project_id' })
    project_id: number;

    @ManyToOne(() => Project, (project) => project.executions)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column({ name: 'query_id' })
    query_id: number;

    @ManyToOne(() => Query, (query) => query.executions)
    @JoinColumn({ name: 'query_id' })
    query: Query;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true,
    })
    index_strategy: IndexStrategy;

    @CreateDateColumn({ type: 'timestamp' })
    execution_timestamp: Date;

    @Column({ type: 'bigint', nullable: true })
    execution_time_ms: string;

    @Column({ type: 'bigint', nullable: true })
    records_examined: string;

    @Column({ type: 'bigint', nullable: true })
    records_returned: string;

    @Column({ type: 'bigint', nullable: true })
    dataset_size_rows: string;

    @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
    dataset_size_mb: number;

    @Column({ type: 'int', nullable: true })
    concurrent_sessions: number;

    @Column({ type: 'bigint', nullable: true })
    shared_buffers_hits: string;

    @Column({ type: 'bigint', nullable: true })
    shared_buffers_reads: string;
}
