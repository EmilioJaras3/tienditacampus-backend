import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BigQuery } from '@google-cloud/bigquery';
import { OAuth2Client } from 'google-auth-library';
import { Project } from './entities/project.entity';
import { Query } from './entities/query.entity';

@Injectable()
export class BenchmarkingService {
    private readonly logger = new Logger(BenchmarkingService.name);

    constructor(
        @InjectEntityManager()
        private readonly entityManager: EntityManager,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Query)
        private readonly queryRepository: Repository<Query>,
    ) { }

    async getCurrentProjectId(): Promise<number> {
        const requiredProjectId = 2;

        try {
            await this.entityManager.query(
                `INSERT INTO projects (project_id, project_type, description, db_engine)
                 VALUES ($1, 'ECOMMERCE', $2, 'POSTGRESQL')
                 ON CONFLICT (project_id) DO NOTHING`,
                [
                    requiredProjectId,
                    'TienditaCampus - Sistema de Comercio Electrónico Universitario',
                ],
            );
        } catch (error) {
            this.logger.error(`Benchmarking schema not ready (projects missing?): ${error.message}`);
            throw error;
        }

        return requiredProjectId;
    }

    async runRegisteredQueries(): Promise<void> {
        const queries = await this.queryRepository.find();
        for (const q of queries) {
            try {
                await this.entityManager.query(q.query_sql);
                this.logger.log(`Consulta ejecutada: ${q.query_description}`);
            } catch (error) {
                this.logger.error(`Error al ejecutar consulta "${q.query_description}": ${error.message}`);
            }
        }
    }

    async processDailySnapshot(authHeader: string): Promise<any> {
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) throw new BadRequestException('OAuth token is required');

        const metrics = await this.entityManager.query('SELECT * FROM v_daily_export');

        if (metrics.length === 0) {
            throw new BadRequestException('No hay métricas acumuladas (calls > 0) para exportar.');
        }

        try {
            const oauth2Client = new OAuth2Client();
            oauth2Client.setCredentials({ access_token: accessToken });

            const bigquery = new BigQuery({
                projectId: 'data-from-software',
                authClient: oauth2Client
            });

            const datasetId = 'benchmarking_warehouse';
            const tableId = 'daily_query_metrics';

            const rows = metrics.map((m: any) => ({
                ...m,
                snapshot_date: m.snapshot_date.toISOString().split('T')[0]
            }));

            await bigquery.dataset(datasetId).table(tableId).insert(rows);

            await this.entityManager.query('SELECT pg_stat_statements_reset()');

            return {
                message: 'Snapshot enviado exitosamente a BigQuery y estadísticas reiniciadas.',
                count: rows.length
            };
        } catch (error) {
            this.logger.error(`Error al enviar a BigQuery: ${error.message}`);
            throw new BadRequestException(`Fallo en envío a BigQuery: ${error.message}`);
        }
    }

    async getQueryMetrics(limit = 20): Promise<any[]> {
        try {
            const metrics = await this.entityManager.query(`
                SELECT 
                    queryid::text as id,
                    LEFT(query, 120) as query,
                    calls,
                    ROUND(total_exec_time::numeric, 2) as total_time_ms,
                    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
                    rows as rows_returned,
                    shared_blks_hit,
                    shared_blks_read
                FROM pg_stat_statements
                WHERE calls > 0
                AND query NOT LIKE '%pg_stat_statements%'
                ORDER BY calls DESC
                LIMIT $1
            `, [limit]);
            return metrics;
        } catch (error) {
            this.logger.warn(`pg_stat_statements no disponible: ${error.message}`);
            return [];
        }
    }
}
