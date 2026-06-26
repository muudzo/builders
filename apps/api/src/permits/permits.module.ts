import { Module } from '@nestjs/common';
import { RegistryModule } from '../registry/registry.module';
import { PermitsController } from './permits.controller';
import { PermitsService } from './permits.service';
import { StageGateService } from './stage-gate.service';

/**
 * Owns the stage-gate state machine (`StageGateService`). PaymentsModule and InspectionsModule
 * import this module to reuse the gate logic instead of duplicating transition rules.
 */
@Module({
  imports: [RegistryModule],
  controllers: [PermitsController],
  providers: [PermitsService, StageGateService],
  exports: [StageGateService],
})
export class PermitsModule {}
