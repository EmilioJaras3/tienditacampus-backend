import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SnapshotService } from "../snapshots/snapshot.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SnapshotScheduler {
  private readonly logger = new Logger(SnapshotScheduler.name);

  constructor(
    private snapshotService: SnapshotService,
    private configService: ConfigService,
  ) {}

  @Cron("0 17 * * *")
  async handleDailySnapshot() {
    try {
      this.logger.log("Ejecutando snapshot programado...");

      const accessToken = this.configService.get<string>("GOOGLE_ACCESS_TOKEN");

      if (!accessToken) {
        this.logger.warn(
          "No hay token disponible. Usuario debe autenticarse primero.",
        );
        return;
      }

      await this.snapshotService.executeDailySnapshot(accessToken);
    } catch (error) {
      this.logger.error(" Error en snapshot programado:", error.message);

    }
  }

  @Cron("0 */6 * * *")
  async handlePeriodicSnapshot() {
    this.logger.log("Snapshot periódico (cada 6 horas)");

    try {
      const accessToken = this.configService.get<string>("GOOGLE_ACCESS_TOKEN");
      if (accessToken) {
        await this.snapshotService.executeDailySnapshot(accessToken);
      } else {
        this.logger.warn("No hay token para snapshot periódico");
      }
    } catch (error) {
      this.logger.error(" Error en snapshot periódico:", error.message);
    }
  }
}