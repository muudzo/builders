import type { BuilderStatus } from '../common/domain';

export interface RegistryVerifyDto {
  regNumber: string;
  found: boolean;
  name?: string;
  category?: string;
  status: BuilderStatus;
  expiresAt?: string;
}

export interface RegistryRowDto {
  id: string;
  regNumber: string;
  name: string;
  category: string;
  status: BuilderStatus;
  expiresAt: string;
}
