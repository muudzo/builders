import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController, AuditController],
  providers: [DashboardService],
})
export class DashboardModule {}
