import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { hash, verify } from '@node-rs/argon2';
import { TwoFactorCode } from './entities/two-factor-code.entity';

@Injectable()
export class TwoFactorService {
    private readonly logger = new Logger(TwoFactorService.name);

    constructor(
        @InjectRepository(TwoFactorCode)
        private readonly twoFactorRepo: Repository<TwoFactorCode>,
    ) {}

    /**
     * Genera un código numérico de 6 dígitos, lo hashea con Argon2
     * y lo guarda en BD con expiración de 10 minutos.
     * Retorna el código en texto plano para enviarlo por email.
     */
    async generateCode(userId: string): Promise<string> {
        // Invalidar códigos anteriores no usados del mismo usuario
        await this.twoFactorRepo.update(
            { userId, used: false },
            { used: true },
        );

        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Hashear el código
        const codeHash = await hash(code, {
            memoryCost: 4096,
            timeCost: 2,
            parallelism: 1,
        });

        // Guardar en BD con expiración de 10 minutos
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

    /**
     * Verifica un código 2FA proporcionado por el usuario.
     * Busca el código más reciente no usado y no expirado.
     * Si coincide, lo marca como usado.
     */
    async verifyCode(userId: string, plainCode: string): Promise<boolean> {
        // Limpiar códigos expirados
        await this.cleanExpiredCodes();

        // Buscar códigos activos del usuario (no usados, no expirados)
        const activeCodes = await this.twoFactorRepo.find({
            where: {
                userId,
                used: false,
            },
            order: { createdAt: 'DESC' },
        });

        for (const record of activeCodes) {
            // Verificar que no esté expirado
            if (new Date() > record.expiresAt) {
                continue;
            }

            // Verificar el hash
            const isValid = await verify(record.codeHash, plainCode);
            if (isValid) {
                // Marcar como usado
                record.used = true;
                await this.twoFactorRepo.save(record);
                this.logger.log(`Código 2FA verificado exitosamente para usuario ${userId}`);
                return true;
            }
        }

        this.logger.warn(`Código 2FA inválido para usuario ${userId}`);
        return false;
    }

    /**
     * Limpia códigos expirados de la base de datos.
     */
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
