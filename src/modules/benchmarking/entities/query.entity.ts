import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Project } from './project.entity';
import { Execution } from './execution.entity';

export enum QueryType {
    SIMPLE_SELECT = 'SIMPLE_SELECT',
    AGGREGATION = 'AGGREGATION',
    JOIN = 'JOIN',
    WINDOW_FUNCTION = 'WINDOW_FUNCTION',
    SUBQUERY = 'SUBQUERY',
    WRITE_OPERATION = 'WRITE_OPERATION',
}

@Entity('queries')
export class Query {
    @PrimaryGeneratedColumn()
    query_id: number;

    @Column({ name: 'project_id' })
    project_id: number;

    @ManyToOne(() => Project, (project) => project.queries)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column({ type: 'text' })
    query_description: string;

    @Column({ type: 'text' })
    query_sql: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    target_table: string;

    @Column({
        type: 'varchar',
        length: 30,
        nullable: true,
    })
    query_type: QueryType;

    @OneToMany(() => Execution, (execution) => execution.query)
    executions: Execution[];
}
