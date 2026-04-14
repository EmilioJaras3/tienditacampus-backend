import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorCode } from './entities/two-factor-code.entity';
import { TwoFactorService } from './two-factor.service';
import { MailerService } from '../mailer/mailer.service';

@Module({
    imports: [TypeOrmModule.forFeature([TwoFactorCode])],
    providers: [TwoFactorService, MailerService],
    exports: [TwoFactorService, MailerService],
})
export class TwoFactorModule {}
