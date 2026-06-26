import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { DashboardService } from './dashboard.service';
import type { DashboardOverviewDto, ReconciliationRowDto } from './dashboard.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles('COUNCIL', 'MINISTRY')
  @Get('overview')
  overview(): Promise<DashboardOverviewDto> {
    return this.dashboard.overview();
  }

  @Roles('COUNCIL', 'MINISTRY')
  @Get('reconciliation')
  reconciliation(): Promise<ReconciliationRowDto[]> {
    return this.dashboard.reconciliation();
  }
}
