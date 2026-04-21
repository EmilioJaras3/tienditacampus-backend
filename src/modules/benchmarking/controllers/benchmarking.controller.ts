import {
  Controller,
  Get,
  Post,
  Body,
  Redirect,
  Res,
  Logger,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import { OAuthBigQueryService } from "../auth/oauth-bigquery.service";
import { SnapshotService } from "../snapshots/snapshot.service";

@Controller("benchmarking")
export class BenchmarkingController {
  private readonly logger = new Logger(BenchmarkingController.name);

  constructor(
    private oauthService: OAuthBigQueryService,
    private snapshotService: SnapshotService,
  ) {}

  @Get("auth/google")
  @Redirect()
  googleAuth() {
    const authUrl = this.oauthService.getAuthUrl();
    return { url: authUrl };
  }

  @Get("auth/callback")
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.status(400).send(" No authorization code provided");
      }

      const tokens = await this.oauthService.getTokenFromCode(code);

      this.logger.log(" Usuario autenticado exitosamente");

      res.redirect(`/dashboard/benchmarking?token=${tokens.accessToken}`);
    } catch (error) {
      this.logger.error(" Error en OAuth callback:", error.message);
      res.status(500).send(` Authentication failed: ${error.message}`);
    }
  }

  @Post("snapshots/execute")
  async executeSnapshot(
    @Body() body: { accessToken: string },
    @Res() res: Response,
  ) {
    try {
      const { accessToken } = body;

      if (!accessToken) {
        return res.status(400).json({ error: "Access token required" });
      }

      await this.snapshotService.executeDailySnapshot(accessToken);

      res.json({
        success: true,
        message: " Snapshot ejecutado y datos enviados a BigQuery",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(" Error en snapshot:", error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  @Get("snapshots/export/:projectId")
  async exportCSV(@Query("projectId") projectId: number, @Res() res: Response) {
    try {
      const csv = await this.snapshotService.exportToCSV(projectId);

      const filename = `project_${projectId}_${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csv);
    } catch (error) {
      this.logger.error(" Error al exportar CSV:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
}