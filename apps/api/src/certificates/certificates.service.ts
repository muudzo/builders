import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CertificateVerifyDto } from './certificates.types';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(qrToken: string): Promise<CertificateVerifyDto> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { qrToken },
      include: { permit: true },
    });

    if (!certificate) {
      return { valid: false };
    }

    return {
      valid: true,
      permitRef: certificate.permit.ref,
      ownerName: certificate.permit.ownerName,
      suburb: certificate.permit.suburb,
      standNumber: certificate.permit.standNumber,
      serial: certificate.serial,
      issuedAt: certificate.issuedAt.toISOString(),
    };
  }
}
