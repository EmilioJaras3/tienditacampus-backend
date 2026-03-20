import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BreakEvenService } from './break-even.service';
import { CalculateBreakEvenDto } from './dto/calculate-break-even.dto';
import { User } from '../users/entities/user.entity';

@Controller('break-even')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class BreakEvenController {
    constructor(private readonly breakEvenService: BreakEvenService) { }

    @Post('calculate')
    calculate(@Body() dto: CalculateBreakEvenDto, @Req() req: any) {
        return this.breakEvenService.calculate(dto, req.user as User);
    }
}
