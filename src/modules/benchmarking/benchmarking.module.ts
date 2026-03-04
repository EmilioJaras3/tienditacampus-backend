import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Query } from './entities/query.entity';
import { Execution } from './entities/execution.entity';
import { BenchmarkingService } from './benchmarking.service';
import { BenchmarkingController } from './benchmarking.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, Query, Execution]),
    ],
    providers: [BenchmarkingService],
    controllers: [BenchmarkingController],
    exports: [BenchmarkingService],
})
export class BenchmarkingModule { }
