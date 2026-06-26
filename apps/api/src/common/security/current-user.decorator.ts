import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../domain';

/** Shape attached to `request.user` by JwtAuthGuard after token verification. */
export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: Role;
  councilId: string | null;
  inspectorId: string | null;
}

/** Inject the authenticated user (or a single field of it) into a controller handler. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
