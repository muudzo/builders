import { IsOptional, IsString } from 'class-validator';

/**
 * Body for POST /payments/paynow/callback. Paynow posts form-encoded fields; the global
 * ValidationPipe + class-transformer will coerce a parsed body into this shape. Only the
 * fields we actually reconcile against are declared — extra Paynow fields are stripped by
 * the global whitelist pipe (forbidNonWhitelisted is intentionally NOT relied upon here since
 * Paynow controls the payload shape, not us).
 */
export class PaynowCallbackDto {
  @IsString()
  reference!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  paynowreference?: string;

  @IsOptional()
  @IsString()
  pollurl?: string;

  @IsOptional()
  @IsString()
  hash?: string;
}
