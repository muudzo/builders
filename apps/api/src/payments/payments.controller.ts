import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common';
import { Public } from '../common/security/public.decorator';
import { Roles } from '../common/security/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/security/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaynowCallbackDto } from './dto/paynow-callback.dto';
import type { InitiatePaymentResult, PaymentStatusDto } from './payments.types';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles('APPLICANT', 'COUNCIL')
  @Post('initiate')
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<InitiatePaymentResult> {
    return this.payments.initiate(dto, user.sub, user.role);
  }

  @Get(':id')
  getStatus(@Param('id') id: string): Promise<PaymentStatusDto> {
    return this.payments.getStatus(id);
  }

  @Roles('APPLICANT', 'COUNCIL')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<PaymentStatusDto> {
    return this.payments.confirm(id, user.sub, user.role);
  }

  /**
   * Paynow posts form-encoded fields we don't fully control; override the global
   * forbidNonWhitelisted pipe for this single route instead of trusting an unbounded body.
   */
  @Public()
  @Post('paynow/callback')
  callback(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
    dto: PaynowCallbackDto,
  ): Promise<{ ok: true }> {
    return this.payments.handlePaynowCallback(dto);
  }
}
