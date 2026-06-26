import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/security/public.decorator';
import { CertificatesService } from './certificates.service';
import type { CertificateVerifyDto } from './certificates.types';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Public()
  @Get('verify/:qrToken')
  verify(@Param('qrToken') qrToken: string): Promise<CertificateVerifyDto> {
    return this.certificates.verify(qrToken);
  }
}
