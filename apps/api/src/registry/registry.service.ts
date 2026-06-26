import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BuilderStatus } from '../common/domain';
import type { RegistryRowDto, RegistryVerifyDto } from './registry.types';

/**
 * Builder-registration register (council / CIFOZ / ZBCA). A stand-in for the real national
 * register API; reused by PermitsService to snapshot `builderStatus` on permit creation.
 */
@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(regNumber: string): Promise<RegistryVerifyDto> {
    const row = await this.prisma.builderRegistry.findUnique({ where: { regNumber } });
    if (!row) {
      return { regNumber, found: false, status: 'UNREGISTERED' };
    }

    return {
      regNumber: row.regNumber,
      found: true,
      name: row.name,
      category: row.category,
      status: row.status as BuilderStatus,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async list(): Promise<RegistryRowDto[]> {
    const rows = await this.prisma.builderRegistry.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      regNumber: row.regNumber,
      name: row.name,
      category: row.category,
      status: row.status as BuilderStatus,
      expiresAt: row.expiresAt.toISOString(),
    }));
  }
}
