import { SetMetadata } from '@nestjs/common';
import type { Role } from '../domain';

export const ROLES_KEY = 'vaka:roles';

/** Restrict a route to one or more roles. Absence means "any authenticated user". */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
