import { DataSource, QueryRunner } from 'typeorm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class TransactionManager {
    constructor(private readonly dataSource: DataSource) {}

    /**
     * Executes a callback within a managed transaction.
     * Automatically handles connect, start, commit, rollback, and release.
     */
    async execute<T>(
        operation: (queryRunner: QueryRunner) => Promise<T>,
        errorMessage = 'Operation failed during transaction',
    ): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const result = await operation(queryRunner);
            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`[TransactionManager] ${errorMessage}:`, error);
            
            // Re-throw if it's already a specialized NestJS exception
            if (error.status && typeof error.status === 'number') {
                throw error;
            }
            
            throw new InternalServerErrorException(errorMessage);
        } finally {
            await queryRunner.release();
        }
    }
}
