import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { hash } from "@node-rs/argon2";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Product } from "../products/entities/product.entity";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async getPublicProfile(id: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      select: [
        "id",
        "firstName",
        "lastName",
        "email",
        "avatarUrl",
        "createdAt",
        "role",
      ],
    });

    if (!user) {
      throw new NotFoundException("Vendedor no encontrado");
    }

    const products = await this.productRepository
      .createQueryBuilder("product")
      .where("product.seller_id = :sellerId", { sellerId: id })
      .andWhere("product.isActive = :isActive", { isActive: true })
      .andWhere(
        `EXISTS (
                SELECT 1 FROM inventory_records inventory
                WHERE inventory.product_id = product.id
                AND inventory.quantity_remaining > 0
                AND inventory.status = 'active'
            )`,
      )
      .getMany();

    return {
      ...user,
      products,
    };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("El email ya está registrado");
    }

    const memoryCost = this.configService.get<number>(
      "ARGON2_MEMORY_COST",
      65536,
    );
    const timeCost = this.configService.get<number>("ARGON2_TIME_COST", 3);
    const parallelism = this.configService.get<number>("ARGON2_PARALLELISM", 4);

    const passwordHash = await hash(dto.password, {
      memoryCost,
      timeCost,
      parallelism,
    });

    const user = this.usersRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      major: dto.major ?? null,
      campusLocation: dto.campusLocation ?? null,
      ...(dto.role ? { role: dto.role } : {}),
    });

    return this.usersRepository.save(user) as Promise<User>;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      action: "UPDATE_PROFILE",
      userId: user.id,
      entityType: "users",
      entityId: user.id,
      description: `Perfil actualizado: ${user.email}`,
      metadata: Object.keys(dto),
    });

    return saved;
  }

  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLoginAt: new Date(),
      loginCount: () => "login_count + 1",
      failedLoginAttempts: 0,
      lockedUntil: null,
    } as any);
  }

  async recordFailedLogin(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;

    const newAttempts = user.failedLoginAttempts + 1;
    const maxAttempts = this.configService.get<number>(
      "MAX_FAILED_LOGIN_ATTEMPTS",
      5,
    );

    const updateData: Partial<User> = {
      failedLoginAttempts: newAttempts,
    };

    if (newAttempts >= maxAttempts) {
      const lockoutMinutes = this.configService.get<number>(
        "LOCKOUT_DURATION_MINUTES",
        15,
      );
      updateData.lockedUntil = new Date(
        Date.now() + lockoutMinutes * 60 * 1000,
      );

      await this.auditService.log({
        action: "SECURITY_LOCKDOWN",
        userId: user.id,
        entityType: "users",
        entityId: user.id,
        level: "error",
        description: `Cuenta bloqueada temporalmente por excesivos intentos fallidos: ${user.email}`,
        metadata: {
          failedAttempts: newAttempts,
          lockoutDuration: lockoutMinutes,
        },
      });
    }

    await this.usersRepository.update(id, updateData);
  }

  async updateRole(
    id: string,
    role: "admin" | "seller" | "buyer",
  ): Promise<void> {
    await this.usersRepository.update(id, { role });

    await this.auditService.log({
      action: "UPDATE_ROLE",
      userId: id,
      entityType: "users",
      entityId: id,
      level: "warn",
      description: `Rol actualizado a ${role} para el usuario ${id}`,
      metadata: { newRole: role },
    });
  }

  async updatePasswordChangedAt(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      passwordChangedAt: new Date(),
    });
  }

  async updateEmailVerified(id: string, isVerified: boolean): Promise<void> {
    await this.usersRepository.update(id, { isEmailVerified: isVerified });
  }
}