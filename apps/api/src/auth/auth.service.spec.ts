import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

interface FakeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  phone: string | null;
  councilId: string | null;
  inspectorId: string | null;
}

function build(seed: FakeUser[] = []) {
  const store = [...seed];
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
        store.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Omit<FakeUser, 'id'> }) => {
        const user = { id: `u_${store.length + 1}`, ...data };
        store.push(user);
        return user;
      }),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
  const ttls: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    JWT_ACCESS_TTL: '900',
    JWT_REFRESH_TTL: '604800',
  };
  const config = { get: jest.fn((key: string) => ttls[key]) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    audit as unknown as AuditService,
  );
  return { service, store };
}

describe('AuthService.register', () => {
  it('creates an APPLICANT (normalized email) and returns tokens', async () => {
    const { service, store } = build();
    const out = await service.register({ name: '  Tariro  ', email: 'Tariro@Example.com', password: 'supersecret8' });
    expect(out.user.role).toBe('APPLICANT');
    expect(out.accessToken).toBeDefined();
    expect(out.refreshToken).toBeDefined();
    expect(store[0].email).toBe('tariro@example.com');
    expect(store[0].name).toBe('Tariro');
  });

  it('rejects a duplicate email with 409 Conflict', async () => {
    const { service } = build([
      { id: 'u1', email: 'dup@x.com', name: 'X', role: 'APPLICANT', passwordHash: 'h', phone: null, councilId: null, inspectorId: null },
    ]);
    await expect(service.register({ name: 'Y', email: 'DUP@x.com', password: 'supersecret8' })).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('AuthService.login', () => {
  it('rejects an unknown email', async () => {
    const { service } = build();
    await expect(service.login('nobody@x.com', 'whatever')).rejects.toThrow(UnauthorizedException);
  });

  it('accepts correct credentials (case-insensitive email)', async () => {
    const hash = await AuthService.hash('password123');
    const { service } = build([
      { id: 'u1', email: 'a@x.com', name: 'A', role: 'APPLICANT', passwordHash: hash, phone: null, councilId: null, inspectorId: null },
    ]);
    const out = await service.login('A@X.com', 'password123');
    expect(out.user.email).toBe('a@x.com');
    expect(out.accessToken).toBeDefined();
  });

  it('rejects a wrong password', async () => {
    const hash = await AuthService.hash('password123');
    const { service } = build([
      { id: 'u1', email: 'a@x.com', name: 'A', role: 'APPLICANT', passwordHash: hash, phone: null, councilId: null, inspectorId: null },
    ]);
    await expect(service.login('a@x.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
  });
});
