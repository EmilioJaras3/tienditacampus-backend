import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { User } from "../users/entities/user.entity";

export interface ForecastResult {
  productId: string;
  productName: string | null;
  dayOfWeek: number;
  recommendedQuantity: number;
  sampleSize: number;
  outliersRemoved: number;
  confidenceInterval: [number, number] | null;
  hasSufficientData: boolean;
  message: string;
  source: "iqr";
  scope: "personal" | "public-demo";
}

interface ProductHistoryRow {
  productId: string;
  productName: string | null;
  quantitySold: number;
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(private readonly dataSource: DataSource) {}

  private async getProductName(productId: string): Promise<string | null> {
    const rows = await this.dataSource.query(
      `
        SELECT name
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [productId],
    );

    return rows[0]?.name ?? null;
  }

  private quantile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const position = (sortedValues.length - 1) * percentile;
    const base = Math.floor(position);
    const rest = position - base;
    const next = sortedValues[base + 1] ?? sortedValues[base];

    return sortedValues[base] + rest * (next - sortedValues[base]);
  }

  private buildForecastResult(
    productId: string,
    productName: string | null,
    dayOfWeek: number,
    demandSeries: number[],
    scope: "personal" | "public-demo",
  ): ForecastResult {
    if (demandSeries.length < 3) {
      return {
        productId,
        productName,
        dayOfWeek,
        recommendedQuantity: 0,
        sampleSize: demandSeries.length,
        outliersRemoved: 0,
        confidenceInterval: null,
        hasSufficientData: false,
        message:
          "Todavia no hay suficientes ventas registradas para recomendar una cantidad con confianza.",
        source: "iqr",
        scope,
      };
    }

    const sorted = [...demandSeries].sort((a, b) => a - b);
    const q1 = this.quantile(sorted, 0.25);
    const q3 = this.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const filtered = sorted.filter((value) => value >= lower && value <= upper);
    const workingSet = filtered.length > 0 ? filtered : sorted;
    const average =
      workingSet.reduce((sum, value) => sum + value, 0) / workingSet.length;

    const variance =
      workingSet.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      workingSet.length;
    const stdDev = Math.sqrt(variance);
    const margin = 1.96 * (stdDev / Math.sqrt(workingSet.length || 1));
    const lowerBound = Math.max(0, Math.floor(average - margin));
    const upperBound = Math.max(lowerBound, Math.ceil(average + margin));

    return {
      productId,
      productName,
      dayOfWeek,
      recommendedQuantity: Math.max(0, Math.ceil(average)),
      sampleSize: demandSeries.length,
      outliersRemoved: demandSeries.length - workingSet.length,
      confidenceInterval: [lowerBound, upperBound],
      hasSufficientData: true,
      message:
        "Esta recomendacion se calculo con tus ventas recientes, dejando fuera dias atipicos para evitar que distorsionen el resultado.",
      source: "iqr",
      scope,
    };
  }

  private async getProductHistory(
    productId: string,
    dayOfWeek: number,
    sellerId?: string,
  ): Promise<ProductHistoryRow[]> {
    const params: Array<string | number> = [productId, dayOfWeek];
    let sellerFilter = "";

    if (sellerId) {
      params.push(sellerId);
      sellerFilter = ` AND ds.seller_id = $${params.length}`;
    }

    const rows = await this.dataSource.query(
      `
        SELECT
          p.id AS "productId",
          p.name AS "productName",
          sd.quantity_sold AS "quantitySold"
        FROM sale_details sd
        INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
        INNER JOIN products p ON p.id = sd.product_id
        WHERE sd.product_id = $1
          AND EXTRACT(ISODOW FROM ds.sale_date) = $2
          AND ds.is_closed = true
          AND ds.sale_date >= CURRENT_DATE - INTERVAL '56 days'
          ${sellerFilter}
        ORDER BY ds.sale_date DESC
      `,
      params,
    );

    return rows.map((row: ProductHistoryRow) => ({
      productId: row.productId,
      productName: row.productName,
      quantitySold: Number(row.quantitySold),
    }));
  }

  async getForecast(
    productId: string,
    dayOfWeek: number,
    sellerId?: string,
  ): Promise<ForecastResult> {
    const history = await this.getProductHistory(productId, dayOfWeek, sellerId);
    const productName = history[0]?.productName ?? (await this.getProductName(productId));
    const demandSeries = history.map((row) => row.quantitySold);

    return this.buildForecastResult(
      productId,
      productName,
      dayOfWeek,
      demandSeries,
      sellerId ? "personal" : "public-demo",
    );
  }

  async getUserPredictionSummary(user: User): Promise<{
    dayOfWeek: number;
    suggestions: ForecastResult[];
    hasSufficientData: boolean;
    message: string;
  }> {
    const dayOfWeek = new Date().getDay() || 7;

    if (user.role === "buyer") {
      return {
        dayOfWeek,
        suggestions: [],
        hasSufficientData: false,
        message:
          "Como comprador no tienes historial de ventas propio. Puedes consultar la estimacion publica por producto desde el modo demo.",
      };
    }

    const products = await this.dataSource.query(
      `
        SELECT id
        FROM products
        WHERE seller_id = $1
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 25
      `,
      [user.id],
    );

    const suggestions = (
      await Promise.all(
        products.map(async (product: { id: string }) =>
          this.getForecast(product.id, dayOfWeek, user.id),
        ),
      )
    ).filter((item) => item.hasSufficientData);

    this.logger.log(
      `Forecast summary for ${user.email}: ${suggestions.length} suggestion(s)`,
    );

    return {
      dayOfWeek,
      suggestions,
      hasSufficientData: suggestions.length > 0,
      message:
        suggestions.length > 0
          ? "Estas sugerencias se calcularon con el mismo motor IQR para todos tus productos con historial suficiente."
          : "Aun no hay suficiente historial en tus productos para darte una recomendacion util en este dia.",
    };
  }
}