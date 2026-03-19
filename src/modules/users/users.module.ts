import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { AdminSeedService } from './admin-seed.service';

@Module({
    imports: [TypeOrmModule.forFeature([User, Product])],
    controllers: [UsersController],
    providers: [UsersService, AdminSeedService],
    exports: [UsersService],
})
export class UsersModule { }
