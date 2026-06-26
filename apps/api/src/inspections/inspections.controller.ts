import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../common/security/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/security/current-user.decorator';
import { InspectionsService } from './inspections.service';
import { BookInspectionDto } from './dto/book-inspection.dto';
import { SignOffDto } from './dto/sign-off.dto';
import type { InspectionJobDto, SignOffResultDto } from './inspections.types';
import type { StageDto } from '../permits/permits.types';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Roles('INSPECTOR')
  @Get('queue')
  queue(@CurrentUser() user: AuthUser): Promise<InspectionJobDto[]> {
    if (!user.inspectorId) {
      throw new ForbiddenException('User is not linked to an inspector record');
    }
    return this.inspections.queue(user.inspectorId);
  }

  @Roles('APPLICANT', 'COUNCIL')
  @Post('book')
  book(@Body() dto: BookInspectionDto, @CurrentUser() user: AuthUser): Promise<StageDto> {
    return this.inspections.book(dto, user.sub, user.role);
  }

  @Roles('INSPECTOR')
  @Post('sign-off')
  signOff(@Body() dto: SignOffDto, @CurrentUser() user: AuthUser): Promise<SignOffResultDto> {
    if (!user.inspectorId) {
      throw new ForbiddenException('User is not linked to an inspector record');
    }
    return this.inspections.signOff(dto, user.inspectorId, user.sub, user.role);
  }

  @Roles('APPLICANT', 'COUNCIL')
  @Post(':stageId/re-request')
  reRequest(@Param('stageId') stageId: string, @CurrentUser() user: AuthUser): Promise<StageDto> {
    return this.inspections.reRequest(stageId, user.sub, user.role);
  }
}
