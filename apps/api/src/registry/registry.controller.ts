import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { RegistryService } from './registry.service';
import type { RegistryRowDto, RegistryVerifyDto } from './registry.types';

@Controller('registry')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}

  /**
   * CONTRACT.md lists no @Roles restriction for verify — any authenticated user (e.g. an
   * APPLICANT live-verifying a builder reg number while filling the new-permit form).
   */
  @Get('verify/:regNumber')
  verify(@Param('regNumber') regNumber: string): Promise<RegistryVerifyDto> {
    return this.registry.verify(regNumber);
  }

  @Roles('COUNCIL', 'MINISTRY')
  @Get()
  list(): Promise<RegistryRowDto[]> {
    return this.registry.list();
  }
}
