import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/security/current-user.decorator';
import { PermitsService } from './permits.service';
import { CreatePermitDto } from './dto/create-permit.dto';
import type { PermitDto } from './permits.types';

@Controller('permits')
export class PermitsController {
  constructor(private readonly permits: PermitsService) {}

  /** APPLICANT sees only their own permits; COUNCIL/MINISTRY see all (enforced in the service). */
  @Roles('APPLICANT', 'COUNCIL', 'MINISTRY')
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<PermitDto[]> {
    return this.permits.findAll(user.sub, user.role);
  }

  @Roles('APPLICANT', 'COUNCIL', 'MINISTRY')
  @Get(':ref')
  findOne(@Param('ref') ref: string, @CurrentUser() user: AuthUser): Promise<PermitDto> {
    return this.permits.findByRef(ref, user.sub, user.role);
  }

  @Roles('COUNCIL', 'APPLICANT')
  @Post()
  create(@Body() dto: CreatePermitDto, @CurrentUser() user: AuthUser): Promise<PermitDto> {
    return this.permits.create(dto, user.sub, user.role);
  }
}
