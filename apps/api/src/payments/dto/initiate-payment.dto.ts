import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PAYMENT_METHODS, type PaymentMethod } from '../../common/domain';

/** Body for POST /payments/initiate. */
export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  stageId!: string;

  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  payerPhone?: string;
}
