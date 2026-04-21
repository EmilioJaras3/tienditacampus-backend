import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { OAuthBigQueryService } from "../auth/oauth-bigquery.service";

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    private dataSource: DataSource,
    private oauthService: OAuthBigQueryService,
  ) {}

  async executeDailySnapshot(accessToken: string): Promise<void> {
    try {
      this.logger.log("Iniciando snapshot diario...");

      const isTokenValid = await this.oauthService.validateToken(accessToken);
      if (!isTokenValid) {
        throw new Error("OAuth token is invalid or expired");
      }
      this.logger.log("Token OAuth validado");

      const rows = await this.queryDailyExport();
      this.logger.log(`${rows.length} registros extraídos de v_daily_export`);

      if (rows.length === 0) {
        this.logger.warn(
          "No hay datos para exportar. ¿Ejecutaste las consultas de prueba?",
        );
        return;
      }

      const jsonData = this.serializeRows(rows);

      await this.oauthService.sendToBigQuery(accessToken, jsonData);
      this.logger.log(`Datos enviados a BigQuery exitosamente`);

      await this.resetStatistics();
      this.logger.log("pg_stat_statements reiniciado");

      this.logger.log("Snapshot diario completado exitosamente");
    } catch (error) {
      this.logger.error("Error en snapshot diario:", error.message);
      this.logger.warn(
        "NO se ejecutó reset. Mantén los datos para reintento.",
      );
      throw error;
    }
  }

  private async queryDailyExport(): Promise<any[]> {
    const result = await this.dataSource.query(`
      SELECT * FROM v_daily_export
      WHERE snapshot_date = CURRENT_DATE
      ORDER BY project_id, queryid;
    `);
    return result || [];
  }

  private serializeRows(rows: any[]): Record<string, any>[] {
    return rows.map((row) => ({
      project_id: row.project_id,
      snapshot_date: row.snapshot_date,
      queryid: row.queryid,
      dbid: row.dbid,
      userid: row.userid,
      query: row.query,
      calls: row.calls,
      total_exec_time_ms: row.total_exec_time_ms,
      mean_exec_time_ms: row.mean_exec_time_ms,
      min_exec_time_ms: row.min_exec_time_ms,
      max_exec_time_ms: row.max_exec_time_ms,
      stddev_exec_time_ms: row.stddev_exec_time_ms,
      rows_returned: row.rows_returned,
      shared_blks_hit: row.shared_blks_hit,
      shared_blks_read: row.shared_blks_read,
      shared_blks_dirtied: row.shared_blks_dirtied,
      shared_blks_written: row.shared_blks_written,
      temp_blks_read: row.temp_blks_read,
      temp_blks_written: row.temp_blks_written,
      ingestion_timestamp: row.ingestion_timestamp,
    }));
  }

  private async resetStatistics(): Promise<void> {
    await this.dataSource.query("SELECT pg_stat_statements_reset();");
  }

  async exportToCSV(projectId: number): Promise<string> {
    const rows = await this.dataSource.query(
      `
      SELECT * FROM v_daily_export
      WHERE project_id = $1 AND snapshot_date = CURRENT_DATE;
    `,
      [projectId],
    );

    const csv = this.rowsToCSV(rows || []);
    return csv;
  }

  private rowsToCSV(rows: any[]): string {
    if (rows.length === 0) return "";

    const headers = Object.keys(rows[0]);
    const headerRow = headers.join(",");

    const dataRows = rows.map((row) => Object.values(row).join(",")).join("\n");

    return `${headerRow}\n${dataRows}`;
  }
}