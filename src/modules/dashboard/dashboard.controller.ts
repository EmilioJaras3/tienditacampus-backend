import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardComparisonQueryDto } from './dto/dashboard-comparison-query.dto';
import { User } from '../users/entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('comparison')
    getComparison(@Req() req: any, @Query() query: DashboardComparisonQueryDto) {
        return this.dashboardService.getComparison(
            req.user as User,
            query.startDate,
            query.endDate,
        );
    }
}
