import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BigQuery } from "@google-cloud/bigquery";
import { google } from "googleapis";

@Injectable()
export class OAuthBigQueryService {
  private readonly logger = new Logger(OAuthBigQueryService.name);
  private readonly oauth2Client: any;

  constructor(private configService: ConfigService) {

    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>("GOOGLE_CLIENT_ID") ||
        "placeholder-client-id",
      this.configService.get<string>("GOOGLE_CLIENT_SECRET") ||
        "placeholder-client-secret",
      this.configService.get<string>("GOOGLE_REDIRECT_URI") ||
        "http://localhost:3001/api/benchmarking/auth/callback"
    );
  }

  getAuthUrl(): string {
    const scopes = ["https://www.googleapis.com/auth/bigquery"];

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: this.generateState(),
    });
  }

  async getTokenFromCode(
    code: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      this.logger.log("OAuth token obtenido");

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (error) {
      this.logger.error("Error al obtener token:", error.message);
      throw error;
    }
  }

  async sendToBigQuery(
    accessToken: string,
    rows: Record<string, any>[],
  ): Promise<void> {
    try {
      const bigquery = new BigQuery({
        projectId: this.configService.get<string>("GCP_PROJECT_ID"),
        credentials: {
          type: "authorized_user",
          client_id: this.configService.get<string>("GOOGLE_CLIENT_ID"),
          client_secret: this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
          refresh_token: accessToken,
        },
      });

      const dataset = this.configService.get<string>("BIGQUERY_DATASET");
      const table = this.configService.get<string>("BIGQUERY_TABLE");

      const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.configService.get<string>("GCP_PROJECT_ID")}/datasets/${dataset}/tables/${table}/insertAll`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: rows.map((row) => ({ json: row })),
          skipInvalidRows: false,
          ignoreUnknownValues: false,
        }),
      });

      if (response.status !== 200) {
        const errorData = await response.json();
        this.logger.error("Errores en insercion:", errorData.errors);
        throw new Error(
          `BigQuery insert errors: ${JSON.stringify(errorData.errors)}`,
        );
      }

      this.logger.log(`${rows.length} registros enviados a BigQuery`);
    } catch (error) {
      this.logger.error("Error al enviar a BigQuery:", error.message);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
      );

      return response.status === 200;
    } catch (error) {
      this.logger.warn("Token invalido o expirado");
      return false;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(7);
  }
}