import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from '@node-rs/argon2';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class AdminSeedService implements OnModuleInit {
    private readonly logger = new Logger(AdminSeedService.name);

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        const emailRaw = this.configService.get<string>('DEFAULT_ADMIN_EMAIL');
        const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD');

        if (!emailRaw || !password) {
            this.logger.warn('DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set. Skipping seed.');
            return;
        }

        const email = emailRaw.toLowerCase();

        const existing = await this.usersRepository.findOne({ where: { email } });

        if (!existing) {
            const memoryCost = this.configService.get<number>('ARGON2_MEMORY_COST', 65536);
            const timeCost = this.configService.get<number>('ARGON2_TIME_COST', 3);
            const parallelism = this.configService.get<number>('ARGON2_PARALLELISM', 4);

            const passwordHash = await hash(password, {
                memoryCost,
                timeCost,
                parallelism,
            });

            const user = this.usersRepository.create({
                email,
                passwordHash,
                firstName: 'Admin',
                lastName: 'User',
                phone: null,
                major: null,
                campusLocation: null,
                role: 'admin',
                isEmailVerified: true,
                isActive: true,
            });

            await this.usersRepository.save(user);
            this.logger.log(`Default admin user created: ${email}`);
            return;
        }

        let needsUpdate = false;
        if (existing.role !== 'admin') {
            existing.role = 'admin';
            needsUpdate = true;
        }
        if (!existing.isEmailVerified) {
            existing.isEmailVerified = true;
            needsUpdate = true;
        }
        if (!existing.isActive) {
            existing.isActive = true;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await this.usersRepository.save(existing);
            this.logger.log(`Default admin user updated: ${email}`);
        }
    }
}
