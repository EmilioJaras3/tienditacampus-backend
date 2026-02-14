import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Query } from './query.entity';
import { Execution } from './execution.entity';

export enum ProjectType {
    ECOMMERCE = 'ECOMMERCE',
    SOCIAL = 'SOCIAL',
    FINANCIAL = 'FINANCIAL',
    HEALTHCARE = 'HEALTHCARE',
    IOT = 'IOT',
    EDUCATION = 'EDUCATION',
    CONTENT = 'CONTENT',
    ENTERPRISE = 'ENTERPRISE',
    LOGISTICS = 'LOGISTICS',
    GOVERNMENT = 'GOVERNMENT',
}

export enum DbEngine {
    POSTGRESQL = 'POSTGRESQL',
    MYSQL = 'MYSQL',
    MONGODB = 'MONGODB',
    OTHER = 'OTHER',
}

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn()
    project_id: number;

    @Column({
        type: 'varchar',
        length: 20,
    })
    project_type: ProjectType;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'varchar',
        length: 20,
    })
    db_engine: DbEngine;

    @OneToMany(() => Query, (query) => query.project)
    queries: Query[];

    @OneToMany(() => Execution, (execution) => execution.project)
    executions: Execution[];
}
