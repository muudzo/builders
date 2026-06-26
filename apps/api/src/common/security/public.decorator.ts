import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'vaka:isPublic';

/** Opt a route out of the global JWT auth guard (e.g. login, public certificate verification). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
