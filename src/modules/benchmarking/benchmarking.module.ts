import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Query } from './entities/query.entity';
import { Execution } from './entities/execution.entity';
import { BenchmarkingService } from './benchmarking.service';
import { BenchmarkingController } from './benchmarking.controller';
import { OAuthBigQueryService } from './auth/oauth-bigquery.service';
import { SnapshotService } from './snapshots/snapshot.service';
import { SnapshotScheduler } from './scheduler/snapshot.scheduler';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, Query, Execution]),
    ],
    providers: [BenchmarkingService, OAuthBigQueryService, SnapshotService, SnapshotScheduler],
    controllers: [BenchmarkingController],
    exports: [BenchmarkingService],
})
export class BenchmarkingModule { }
