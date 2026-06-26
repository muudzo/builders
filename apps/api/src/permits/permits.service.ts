import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RegistryService } from '../registry/registry.service';
import { STAGE_DEFINITIONS } from '../common/domain';
import type { Role } from '../common/domain';
import { PERMIT_INCLUDE, toPermitDto, type PermitWithRelations } from './permits.mapper';
import type { PermitDto } from './permits.types';
import type { CreatePermitDto } from './dto/create-permit.dto';

const REF_PREFIX = 'BCC';

@Injectable()
export class PermitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: RegistryService,
  ) {}

  async findAll(): Promise<PermitDto[]> {
    const permits = await this.prisma.permit.findMany({
      include: PERMIT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return permits.map((permit) => toPermitDto(permit as PermitWithRelations));
  }

  async findByRef(ref: string): Promise<PermitDto> {
    const permit = await this.prisma.permit.findUnique({
      where: { ref },
      include: PERMIT_INCLUDE,
    });
    if (!permit) throw new NotFoundException(`Permit ${ref} not found`);
    return toPermitDto(permit as PermitWithRelations);
  }

  async create(dto: CreatePermitDto, actorId: string, actorRole: Role): Promise<PermitDto> {
    const council = await this.prisma.council.findFirst();
    if (!council) {
      throw new BadRequestException('No council configured; cannot approve a permit');
    }

    const verification = await this.registry.verify(dto.builderRegNumber);
    const builderName = verification.found ? (verification.name ?? 'Unknown builder') : 'Unregistered builder';

    const ref = await this.generateRef();

    const permit = await this.prisma.permit.create({
      data: {
        ref,
        standNumber: dto.standNumber,
        suburb: dto.suburb,
        projectType: dto.projectType,
        ownerName: dto.ownerName,
        ownerPhone: dto.ownerPhone,
        builderRegNumber: dto.builderRegNumber,
        builderName,
        builderStatus: verification.status,
        status: 'APPROVED',
        councilId: council.id,
        stages: {
          create: STAGE_DEFINITIONS.map((def) => ({
            key: def.key,
            label: def.label,
            order: def.order,
            amountCents: def.amountCents,
            status: def.order === 0 ? 'AWAITING_PAYMENT' : 'LOCKED',
          })),
        },
      },
      include: PERMIT_INCLUDE,
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'PERMIT_APPROVED',
      entity: 'Permit',
      entityId: permit.id,
      metadata: { permitRef: permit.ref, suburb: permit.suburb, builderRegNumber: dto.builderRegNumber },
    });

    return toPermitDto(permit as PermitWithRelations);
  }

  /** BCC-<year>-<5-digit sequence>, unique by retry-on-collision (sequence is best-effort, not transactional). */
  private async generateRef(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.permit.count();
    const sequence = (count + 1).toString().padStart(5, '0');
    const candidate = `${REF_PREFIX}-${year}-${sequence}`;

    const clash = await this.prisma.permit.findUnique({ where: { ref: candidate } });
    if (!clash) return candidate;
    return `${REF_PREFIX}-${year}-${Date.now().toString().slice(-5)}`;
  }
}
