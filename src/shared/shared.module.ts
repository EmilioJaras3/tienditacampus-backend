import { Global, Module } from '@nestjs/common';
import { TransactionManager } from './utils/transaction-manager.util';

@Global()
@Module({
    providers: [TransactionManager],
    exports: [TransactionManager],
})
export class SharedModule {}
