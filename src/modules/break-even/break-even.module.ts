import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { BreakEvenController } from './break-even.controller';
import { BreakEvenService } from './break-even.service';

@Module({
    imports: [TypeOrmModule.forFeature([Product])],
    controllers: [BreakEvenController],
    providers: [BreakEvenService],
    exports: [BreakEvenService],
})
export class BreakEvenModule { }
