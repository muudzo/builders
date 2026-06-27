import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import type { AuthUser } from '../common/security/current-user.decorator';
import type { Role } from '../common/domain';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Hash a plaintext password with argon2id (used by the seed and any registration flow). */
  static hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  /** Public self-registration. Creates an APPLICANT and logs them straight in. */
  async register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<IssuedTokens> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await AuthService.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone?.trim() || null,
        role: 'APPLICANT',
      },
    });

    await this.audit.record({
      actorId: user.id,
      actorRole: 'APPLICANT',
      action: 'AUTH_REGISTER',
      entity: 'User',
      entityId: user.id,
    });

    return this.issueTokens(user.id);
  }

  async login(email: string, password: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.audit.record({
      actorId: user.id,
      actorRole: user.role as Role,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user.id,
    });

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    let sub: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(sub);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  private async issueTokens(userId: string): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const authUser = this.toAuthUser(user);

    const accessToken = await this.jwt.signAsync(authUser, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL') ?? 900),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: Number(this.config.get('JWT_REFRESH_TTL') ?? 604800),
      },
    );
    return { accessToken, refreshToken, user: authUser };
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    councilId: string | null;
    inspectorId: string | null;
  }): AuthUser {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      councilId: user.councilId,
      inspectorId: user.inspectorId,
    };
  }
}
