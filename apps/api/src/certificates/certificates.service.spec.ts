import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from './certificates.service';

interface FakeCertificate {
  qrToken: string;
  serial: string;
  issuedAt: Date;
  permit: { ref: string; ownerName: string; suburb: string; standNumber: string };
}

function build(certs: FakeCertificate[] = []) {
  const prisma = {
    certificate: {
      findUnique: jest.fn(async ({ where }: { where: { qrToken: string } }) =>
        certs.find((c) => c.qrToken === where.qrToken) ?? null,
      ),
    },
  };
  return { service: new CertificatesService(prisma as unknown as PrismaService) };
}

describe('CertificatesService.verify', () => {
  it('returns valid:true with permit details for a real token', async () => {
    const { service } = build([
      {
        qrToken: 'vaka_token_1',
        serial: 'CoO-BCC-2025-00097',
        issuedAt: new Date(),
        permit: { ref: 'BCC-2025-00097', ownerName: 'Sipho Moyo', suburb: 'Famona', standNumber: 'Stand 2204' },
      },
    ]);
    const result = await service.verify('vaka_token_1');
    expect(result.valid).toBe(true);
    expect(result.permitRef).toBe('BCC-2025-00097');
    expect(result.ownerName).toBe('Sipho Moyo');
  });

  it('returns valid:false for an unknown/forged token', async () => {
    const { service } = build([]);
    const result = await service.verify('forged');
    expect(result.valid).toBe(false);
    expect(result.permitRef).toBeUndefined();
  });
});
