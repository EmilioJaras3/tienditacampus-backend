import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BigQuery } from '@google-cloud/bigquery';
import { OAuth2Client } from 'google-auth-library';
import { Project } from './entities/project.entity';
import { Query } from './entities/query.entity';
import { BenchmarkingQueries } from './benchmarking.queries';

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
        private readonly configService: ConfigService,
    ) { }

    /**
     * Obtiene el ID del proyecto actual o crea uno por defecto si no existe.
     */
    async getCurrentProjectId(): Promise<number> {
        let project = await this.projectRepository.findOne({ where: {} });
        if (!project) {
            project = this.projectRepository.create({
                project_type: 'ECOMMERCE' as any,
                description: 'TienditaCampus - Sistema de Comercio Electrónico Universitario',
                db_engine: 'POSTGRESQL' as any,
            });
            project = await this.projectRepository.save(project);
        }
        return project.project_id;
    }

    /**
     * Ejecuta todas las consultas registradas para generar métricas.
     */
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

    /**
     * Captura el snapshot actual de pg_stat_statements y lo envía a BigQuery.
     */
    async processDailySnapshot(authHeader: string): Promise<any> {
        const accessToken = authHeader.replace('Bearer ', '');
        if (!accessToken) throw new BadRequestException('OAuth token is required');

        // 1. Obtener datos desde la VISTA v_daily_export (Requerimiento del profesor)
        const metrics = await this.entityManager.query(BenchmarkingQueries.DAILY_EXPORT);

        if (metrics.length === 0) {
            throw new BadRequestException('No hay métricas acumuladas (calls > 0) para exportar.');
        }

        // 2. Enviar a BigQuery usando el token del usuario
        try {
            const oauth2Client = new OAuth2Client();
            oauth2Client.setCredentials({ access_token: accessToken });

            const bigquery = new BigQuery({
                projectId: this.configService.get<string>('bigquery.projectId'),
                authClient: oauth2Client
            });

            const datasetId = this.configService.get<string>('bigquery.datasetId');
            const tableId = this.configService.get<string>('bigquery.tableId');

            // Insertar rows directamente
            const rows = metrics.map((m: any) => ({
                ...m,
                snapshot_date: m.snapshot_date.toISOString().split('T')[0] // Asegurar formato YYYY-MM-DD
            }));

            await bigquery.dataset(datasetId).table(tableId).insert(rows);

            // 3. Solo si el envío es exitoso, reiniciar estadísticas (Requerimiento del profesor)
            await this.entityManager.query(BenchmarkingQueries.RESET_STATEMENTS);

            return {
                message: 'Snapshot enviado exitosamente a BigQuery y estadísticas reiniciadas.',
                count: rows.length
            };
        } catch (error) {
            this.logger.error(`Error al enviar a BigQuery: ${error.message}`);
            throw new BadRequestException(`Fallo en envío a BigQuery: ${error.message}`);
        }
    }

    /**
     * Obtiene métricas reales directamente de pg_stat_statements.
     */
    async getQueryMetrics(limit = 20): Promise<any[]> {
        try {
            const metrics = await this.entityManager.query(
                BenchmarkingQueries.QUERY_METRICS,
                [limit]
            );
            return metrics;
        } catch (error) {
            this.logger.warn(`pg_stat_statements no disponible: ${error.message}`);
            return [];
        }
    }
}
