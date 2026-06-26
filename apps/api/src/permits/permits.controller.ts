import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/security/current-user.decorator';
import { PermitsService } from './permits.service';
import { CreatePermitDto } from './dto/create-permit.dto';
import type { PermitDto } from './permits.types';

@Controller('permits')
export class PermitsController {
  constructor(private readonly permits: PermitsService) {}

  /**
   * Demo scope: COUNCIL/MINISTRY/APPLICANT see all seeded permits. In production this would
   * be scoped to `WHERE ownerPhone = currentUser.phone` (or a real owner relation) for APPLICANT,
   * and to the inspector's council for INSPECTOR — deferred here since auth has no owner linkage yet.
   */
  @Roles('APPLICANT', 'COUNCIL', 'MINISTRY')
  @Get()
  findAll(): Promise<PermitDto[]> {
    return this.permits.findAll();
  }

  @Roles('APPLICANT', 'COUNCIL', 'MINISTRY')
  @Get(':ref')
  findOne(@Param('ref') ref: string): Promise<PermitDto> {
    return this.permits.findByRef(ref);
  }

  @Roles('COUNCIL', 'APPLICANT')
  @Post()
  create(@Body() dto: CreatePermitDto, @CurrentUser() user: AuthUser): Promise<PermitDto> {
    return this.permits.create(dto, user.sub, user.role);
  }
}
