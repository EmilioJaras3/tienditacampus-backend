import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Category } from "./entities/category.entity";
import { User } from "../users/entities/user.entity";
import { InventoryRecord } from "../inventory/entities/inventory-record.entity";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(InventoryRecord)
    private readonly inventoryRepository: Repository<InventoryRecord>,
    private readonly auditService: AuditService,
  ) {}

  async findAllCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
  }

  async create(
    createProductDto: CreateProductDto,
    user: User,
  ): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      seller: user,
      sellerId: user.id,
    });
    const saved = await this.productRepository.save(product);

    await this.auditService.log({
      action: "CREATE_PRODUCT",
      userId: user.id,
      entityType: "products",
      entityId: saved.id,
      description: `Producto creado: ${saved.name}`,
      metadata: { salePrice: saved.salePrice },
    });

    return saved;
  }

  async findAll(
    user: User,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const qb = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "cat")
      .leftJoin(
        "inventory_records",
        "inventory",
        "inventory.product_id = product.id",
      )
      .select([
        "product.id",
        "product.name",
        "product.description",
        "product.unitCost",
        "product.salePrice",
        "product.isPerishable",
        "product.shelfLifeDays",
        "product.imageUrl",
        "product.isActive",
        "product.createdAt",
        "cat.id",
        "cat.name",
      ])
      .addSelect("COALESCE(SUM(inventory.quantity_remaining), 0)", "stock");
    if (user.role !== "admin") {
      qb.where("product.sellerId = :sellerId", { sellerId: user.id });
    }
    qb.andWhere("product.isActive = :isActive", { isActive: true })

      .groupBy("product.id")
      .addGroupBy("cat.id")
      .orderBy("product.createdAt", "DESC");

    const totalQb = this.productRepository.createQueryBuilder("product");
    if (user.role !== "admin") {
      totalQb.where("product.sellerId = :sellerId", { sellerId: user.id });
    }
    const total = await totalQb
      .andWhere("product.isActive = :isActive", { isActive: true })
      .getCount();

    qb.offset((page - 1) * limit).limit(limit);

    const rawResults = await qb.getRawMany();

    const wasteRateQuery = `SELECT
                sd.product_id,
                COALESCE(SUM(sd.quantity_lost), 0)::int AS total_lost,
                COALESCE(SUM(sd.quantity_sold + sd.quantity_lost), 0)::int AS total_handled
            FROM sale_details sd
            INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
            WHERE 1=1
              ${user.role === "admin" ? "" : "AND ds.seller_id = $1"}
              AND ds.sale_date >= (CURRENT_DATE - INTERVAL '30 days')
            GROUP BY sd.product_id`;

    const wasteRates = await this.productRepository.query(
      wasteRateQuery,
      user.role === "admin" ? [] : [user.id],
    );

    const wasteRateMap = new Map<string, number>();
    wasteRates.forEach((row: any) => {
      const lost = Number(row.total_lost);
      const handled = Number(row.total_handled);
      wasteRateMap.set(row.product_id, handled > 0 ? lost / handled : 0);
    });

    const data = rawResults.map((raw) => {
      const stock = parseInt(raw.stock || raw.product_stock || "0", 10);
      const unitCost = parseFloat(
        raw.product_unit_cost || raw.product_unitCost || "0",
      );
      const salePrice = parseFloat(
        raw.product_sale_price || raw.product_salePrice || "0",
      );

      const wasteRate = wasteRateMap.get(raw.product_id) || 0;
      const effectiveUnitCost = unitCost * (1 + wasteRate);
      const margin = salePrice - effectiveUnitCost;
      const totalInvestment = stock * unitCost;

      const breakEvenUnits =
        margin > 0 && totalInvestment > 0
          ? Math.ceil(totalInvestment / margin)
          : 0;

      return {
        id: raw.product_id,
        name: raw.product_name,
        description: raw.product_description,
        unitCost: unitCost,
        salePrice: salePrice,
        isPerishable: raw.product_is_perishable || raw.product_isPerishable,
        shelfLifeDays: raw.product_shelf_life_days || raw.product_shelfLifeDays,
        imageUrl: raw.product_image_url || raw.product_imageUrl,
        createdAt: raw.product_created_at || raw.product_createdAt,
        category: raw.cat_id
          ? {
              id: raw.cat_id,
              name: raw.cat_name,
            }
          : null,
        stock,
        wasteRate: Number((wasteRate * 100).toFixed(2)),
        breakEvenUnits,
      };
    });

    return { data, total, page, limit };
  }

  async findMarketplace(
    query?: string,
    sellerId?: string,
    category?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const qb = this.productRepository
      .createQueryBuilder("product")
      .leftJoin("product.seller", "seller")
      .leftJoin("product.category", "cat")
      .leftJoin(
        "inventory_records",
        "inventory",
        `inventory.product_id = product.id AND inventory.status = 'active' AND (inventory.expires_at IS NULL OR inventory.expires_at >= CURRENT_DATE)`,
      )
      .select([
        "product.id",
        "product.name",
        "product.description",
        "product.salePrice",
        "product.imageUrl",
        "product.createdAt",
        "seller.id",
        "seller.firstName",
        "seller.lastName",
        "seller.avatarUrl",
        "cat.id",
        "cat.name",
      ])
      .addSelect("SUM(inventory.quantity_remaining)", "quantityRemaining")
      .where("product.isActive = :isActive", { isActive: true })
      .groupBy("product.id")
      .addGroupBy("product.name")
      .addGroupBy("product.description")
      .addGroupBy("product.salePrice")
      .addGroupBy("product.imageUrl")
      .addGroupBy("product.createdAt")
      .addGroupBy("seller.id")
      .addGroupBy("seller.firstName")
      .addGroupBy("seller.lastName")
      .addGroupBy("seller.avatarUrl")
      .addGroupBy("cat.id")
      .addGroupBy("cat.name")
      .orderBy("product.createdAt", "DESC");

    if (sellerId) {
      qb.andWhere("seller.id = :sellerId", { sellerId });
    }

    if (category && category !== "Todos") {
      qb.andWhere("cat.name = :category", { category });
    }

    if (query) {
      qb.andWhere(
        "(product.name ILIKE :query OR product.description ILIKE :query)",
        { query: `%${query}%` },
      );
    }

    const totalCountQb = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "inventory_records",
        "inventory",
        `inventory.product_id = product.id AND inventory.status = 'active' AND (inventory.expires_at IS NULL OR inventory.expires_at >= CURRENT_DATE)`,
      )
      .where("product.isActive = :isActive", { isActive: true });

    if (sellerId)
      totalCountQb
        .leftJoin("product.seller", "seller")
        .andWhere("seller.id = :sellerId", { sellerId });
    if (category && category !== "Todos")
      totalCountQb
        .leftJoin("product.category", "cat")
        .andWhere("cat.name = :category", { category });
    if (query)
      totalCountQb.andWhere(
        "(product.name ILIKE :query OR product.description ILIKE :query)",
        { query: `%${query}%` },
      );

    const total = await totalCountQb.getCount();

    qb.offset((page - 1) * limit).limit(limit);

    const rawResults = await qb.getRawMany();

    const data = rawResults.map((raw) => ({
      id: raw.product_id,
      name: raw.product_name,
      description: raw.product_description,
      salePrice: parseFloat(
        raw.product_sale_price || raw.product_salePrice || "0",
      ),
      imageUrl: raw.product_image_url || raw.product_imageUrl,
      createdAt: raw.product_created_at || raw.product_createdAt,
      seller: {
        id: raw.seller_id,
        firstName: raw.seller_first_name || raw.seller_firstName,
        lastName: raw.seller_last_name || raw.seller_lastName,
        avatarUrl: raw.seller_avatar_url || raw.seller_avatarUrl,
      },
      category: {
        id: raw.cat_id || raw.category_id,
        name: raw.cat_name || raw.category_name,
      },
      quantityRemaining: parseInt(
        raw.quantityRemaining || raw.quantityremaining || "0",
        10,
      ),
    }));

    return { data, total, page, limit };
  }

  async findOneMarketplace(id: string): Promise<Product> {
    const product = await this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.seller", "seller")
      .where("product.id = :id", { id })
      .andWhere("product.isActive = :isActive", { isActive: true })
      .getOne();

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found or inactive`,
      );
    }

    if (product.seller) {
      delete (product.seller as Partial<User>).passwordHash;
      delete (product.seller as Partial<User>).failedLoginAttempts;
      delete (product.seller as Partial<User>).lockedUntil;
      delete (product.seller as Partial<User>).passwordChangedAt;
      delete (product.seller as Partial<User>).twoFactorCode;
      delete (product.seller as Partial<User>).twoFactorExpires;
    }

    return product;
  }

  async findOne(id: string, user: User): Promise<Product> {
    const product = await this.productRepository.findOne({
      where:
        user.role === "admin"
          ? { id, isActive: true }
          : { id, sellerId: user.id, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: User,
  ): Promise<Product> {
    const product = await this.findOne(id, user);
    Object.assign(product, updateProductDto);
    const saved = await this.productRepository.save(product);

    await this.auditService.log({
      action: "UPDATE_PRODUCT",
      userId: user.id,
      entityType: "products",
      entityId: saved.id,
      description: `Producto actualizado: ${saved.name}`,
      metadata: { updates: updateProductDto },
    });

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const product = await this.findOne(id, user);
    product.isActive = false;
    await this.productRepository.save(product);

    await this.auditService.log({
      action: "DELETE_PRODUCT",
      userId: user.id,
      entityType: "products",
      entityId: product.id,
      description: `Producto eliminado: ${product.name}`,
    });
  }
}