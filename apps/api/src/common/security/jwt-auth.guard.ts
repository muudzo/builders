import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthUser } from './current-user.decorator';

/**
 * Global guard: every route requires a valid access token unless marked @Public().
 * Verifies the Bearer token and attaches the decoded user to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      (request as Request & { user: AuthUser }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
