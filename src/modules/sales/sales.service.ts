import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { PrepareDailySaleDto } from './dto/prepare-daily-sale.dto';
import { TrackSaleDto } from './dto/track-sale.dto';
import { SalesRepository } from './repositories/sales.repository';
import { CreateDailySaleUseCase } from './use-cases/create-daily-sale.use-case';
import { CloseDayUseCase } from './use-cases/close-day.use-case';
import { TrackSaleUseCase } from './use-cases/track-sale.use-case';

@Injectable()
export class SalesService {
    constructor(
        private readonly salesRepository: SalesRepository,
        private readonly createDailySaleUseCase: CreateDailySaleUseCase,
        private readonly closeDayUseCase: CloseDayUseCase,
        private readonly trackSaleUseCase: TrackSaleUseCase,
    ) { }

    async getPrediction(user: User): Promise<any> {
        return await this.salesRepository.getPrediction(user.id);
    }

    async closeDay(user: User, wastes: { productId: string; waste: number; wasteReason?: 'expired' | 'damaged' | 'other' }[]): Promise<any> {
        return await this.closeDayUseCase.execute(user, wastes);
    }

    async findToday(user: User): Promise<any | null> {
        return await this.salesRepository.findToday(user.id);
    }

    async prepareDay(prepareDto: PrepareDailySaleDto, user: User): Promise<any> {
        return await this.createDailySaleUseCase.execute(prepareDto, user);
    }

    async trackProduct(trackDto: TrackSaleDto, user: User): Promise<any> {
        return await this.trackSaleUseCase.execute(trackDto, user);
    }

    async getROI(user: User, startDate?: string, endDate?: string) {
        return await this.salesRepository.getROI(user.id, startDate, endDate);
    }

    async getHistory(user: User) {
        return await this.salesRepository.getHistory(user.id);
    }

    async getByWeekdayAnalytics(user: User, startDate?: string, endDate?: string) {
        return await this.salesRepository.getByWeekdayAnalytics(user.id, startDate, endDate);
    }
}
