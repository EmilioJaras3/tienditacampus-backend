import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { InventoryRecord } from "./entities/inventory-record.entity";
import { CreateInventoryRecordDto } from "./dto/create-inventory-record.dto";
import { User } from "../users/entities/user.entity";
import { Product } from "../products/entities/product.entity";

import { AuditService } from "../audit/audit.service";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryRecord)
    private readonly inventoryRepository: Repository<InventoryRecord>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly auditService: AuditService,
  ) {}

  async addStock(
    createInventoryDto: CreateInventoryRecordDto,
    user: User,
  ): Promise<InventoryRecord> {

    const product = await this.productRepository.findOne({
      where: {
        id: createInventoryDto.productId,
        sellerId: user.id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        "Producto no encontrado para el vendedor autenticado",
      );
    }

    let expiresAt: string | null = null;
    if (
      product.isPerishable &&
      product.shelfLifeDays !== null &&
      product.shelfLifeDays !== undefined
    ) {
      const baseDateStr =
        createInventoryDto.recordDate || new Date().toISOString().split("T")[0];
      const [year, month, day] = baseDateStr.split("-").map(Number);
      const baseDate = new Date(Date.UTC(year, month - 1, day));
      baseDate.setUTCDate(baseDate.getUTCDate() + product.shelfLifeDays);
      expiresAt = baseDate.toISOString().split("T")[0];
    }

    const record = this.inventoryRepository.create({
      ...createInventoryDto,
      expiresAt,
      quantityInitial: createInventoryDto.quantity,
      quantityRemaining: createInventoryDto.quantity,
      unitCost: createInventoryDto.unitCost,
      investmentAmount:
        createInventoryDto.quantity * createInventoryDto.unitCost,
      seller: user,
      sellerId: user.id,
      status: "active",
    });

    const saved = await this.inventoryRepository.save(record);

    await this.auditService.log({
      action: "ADD_STOCK",
      userId: user.id,
      entityType: "inventory_records",
      entityId: saved.id,
      description: `Stock añadido: ${saved.quantityInitial} unidades para el producto ${product.name}`,
      metadata: { quantity: saved.quantityInitial, unitCost: saved.unitCost },
    });

    return saved;
  }

  async getHistoryByProduct(
    productId: string,
    user: User,
  ): Promise<InventoryRecord[]> {
    const product = await this.productRepository.findOne({
      where:
        user.role === "admin"
          ? { id: productId, isActive: true }
          : { id: productId, sellerId: user.id, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(
        "Producto no encontrado para el vendedor autenticado",
      );
    }

    const sellerId = user.role === "admin" ? product.sellerId : user.id;

    return await this.inventoryRepository
      .createQueryBuilder("inventory")
      .where("inventory.product_id = :productId", { productId })
      .andWhere("inventory.seller_id = :sellerId", { sellerId })
      .orderBy("inventory.record_date", "DESC")
      .addOrderBy("inventory.created_at", "DESC")
      .getMany();
  }

  async consumeFIFO(
    productId: string,
    sellerId: string,
    quantity: number,
    manager: EntityManager,
  ): Promise<number> {
    if (quantity <= 0) return 0;

    const activeLots = await manager
      .createQueryBuilder(InventoryRecord, "ir")
      .where("ir.product_id = :productId", { productId })
      .andWhere("ir.seller_id = :sellerId", { sellerId })
      .andWhere("ir.status = :status", { status: "active" })
      .andWhere("ir.quantity_remaining > 0")
      .orderBy("ir.record_date", "ASC")
      .addOrderBy("ir.expires_at", "ASC", "NULLS LAST")
      .getMany();

    const totalAvailable = activeLots.reduce(
      (sum, lot) => sum + lot.quantityRemaining,
      0,
    );
    if (totalAvailable < quantity) {
      throw new BadRequestException(
        `Stock insuficiente para producto ${productId}. ` +
          `Disponible: ${totalAvailable}, Requerido: ${quantity}`,
      );
    }

    let remaining = quantity;
    let totalConsumed = 0;

    for (const lot of activeLots) {
      if (remaining <= 0) break;

      const canConsume = Math.min(lot.quantityRemaining, remaining);
      lot.quantityRemaining -= canConsume;
      remaining -= canConsume;
      totalConsumed += canConsume;

      if (lot.quantityRemaining === 0) {
        lot.status = "sold_out";
      }

      await manager.save(InventoryRecord, lot);
    }

    return totalConsumed;
  }
}