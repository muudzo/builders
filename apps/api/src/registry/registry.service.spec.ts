import { PrismaService } from '../prisma/prisma.service';
import { RegistryService } from './registry.service';

interface FakeBuilder {
  id: string;
  regNumber: string;
  name: string;
  category: string;
  status: string;
  expiresAt: Date;
}

function build(rows: FakeBuilder[] = []) {
  const prisma = {
    builderRegistry: {
      findUnique: jest.fn(async ({ where }: { where: { regNumber: string } }) =>
        rows.find((r) => r.regNumber === where.regNumber) ?? null,
      ),
      findMany: jest.fn(async () => rows),
    },
  };
  return { service: new RegistryService(prisma as unknown as PrismaService) };
}

describe('RegistryService.verify', () => {
  it('returns found + status + name for a known builder', async () => {
    const { service } = build([
      { id: 'b1', regNumber: 'BCC/2021/0412', name: 'Acme', category: 'Category A', status: 'VALID', expiresAt: new Date() },
    ]);
    const result = await service.verify('BCC/2021/0412');
    expect(result.found).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.name).toBe('Acme');
  });

  it('returns UNREGISTERED for an unknown number', async () => {
    const { service } = build([]);
    const result = await service.verify('DOES-NOT-EXIST');
    expect(result.found).toBe(false);
    expect(result.status).toBe('UNREGISTERED');
  });
});
