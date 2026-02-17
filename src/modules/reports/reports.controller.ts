import { Controller, Get, Post, Query, Req, UseGuards, Param, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { User } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post('weekly/generate')
    generateWeeklyReport(@Req() req: any, @Query('weekStart') weekStart?: string) {
        return this.reportsService.generateWeeklyReport(req.user as User, weekStart);
    }

    @Get('weekly')
    getWeeklyReports(
        @Req() req: any,
        @Query('startWeek') startWeek?: string,
        @Query('endWeek') endWeek?: string,
    ) {
        return this.reportsService.getWeeklyReports(req.user as User, startWeek, endWeek);
    }

    @Get('weekly/:id')
    getReportById(@Param('id') id: string, @Req() req: any) {
        return this.reportsService.findOne(id, req.user as User);
    }

    @Delete('weekly/:id')
    deleteReport(@Param('id') id: string, @Req() req: any) {
        return this.reportsService.remove(id, req.user as User);
    }
}
