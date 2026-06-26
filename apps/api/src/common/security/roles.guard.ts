import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from '../domain';
import type { AuthUser } from './current-user.decorator';

/**
 * Runs after JwtAuthGuard. If a route declares @Roles(...), the authenticated user's
 * role must be in that set. No @Roles means any authenticated user is allowed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
