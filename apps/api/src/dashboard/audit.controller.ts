import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { DashboardService } from './dashboard.service';
import type { AuditDto } from './dashboard.types';

/**
 * CONTRACT.md places this at top-level `GET /audit` (not nested under /dashboard), but it
 * belongs to the dashboard feature area Agent A owns, so it lives alongside DashboardService.
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles('COUNCIL', 'MINISTRY')
  @Get()
  findAll(): Promise<AuditDto[]> {
    return this.dashboard.auditTrail();
  }
}
