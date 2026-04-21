import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { hash, verify } from "@node-rs/argon2";
import { TwoFactorCode } from "./entities/two-factor-code.entity";

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(TwoFactorCode)
    private readonly twoFactorRepo: Repository<TwoFactorCode>,
  ) {}

  async generateCode(userId: string): Promise<string> {

    await this.twoFactorRepo.update({ userId, used: false }, { used: true });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const codeHash = await hash(code, {
      memoryCost: 4096,
      timeCost: 2,
      parallelism: 1,
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const twoFactorCode = this.twoFactorRepo.create({
      userId,
      codeHash,
      expiresAt,
      used: false,
    });

    await this.twoFactorRepo.save(twoFactorCode);

    this.logger.log(`Código 2FA generado para usuario ${userId}`);
    return code;
  }

  async verifyCode(userId: string, plainCode: string): Promise<boolean> {

    await this.cleanExpiredCodes();

    const activeCodes = await this.twoFactorRepo.find({
      where: {
        userId,
        used: false,
      },
      order: { createdAt: "DESC" },
    });

    for (const record of activeCodes) {

      if (new Date() > record.expiresAt) {
        continue;
      }

      const isValid = await verify(record.codeHash, plainCode);
      if (isValid) {

        record.used = true;
        await this.twoFactorRepo.save(record);
        this.logger.log(
          `Código 2FA verificado exitosamente para usuario ${userId}`,
        );
        return true;
      }
    }

    this.logger.warn(`Código 2FA inválido para usuario ${userId}`);
    return false;
  }

  async cleanExpiredCodes(): Promise<void> {
    const result = await this.twoFactorRepo.delete({
      expiresAt: LessThan(new Date()),
      used: true,
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Limpiados ${result.affected} códigos 2FA expirados`);
    }
  }
}