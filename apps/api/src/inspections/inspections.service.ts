import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StageGateService } from '../permits/stage-gate.service';
import { toStageDto, type StageWithRelations } from '../permits/permits.mapper';
import type { Role } from '../common/domain';
import type { BookInspectionDto } from './dto/book-inspection.dto';
import type { SignOffDto } from './dto/sign-off.dto';
import type { InspectionJobDto, SignOffResultDto } from './inspections.types';
import type { StageDto } from '../permits/permits.types';

const QUEUE_STATUSES = ['PAID_AWAITING_INSPECTION', 'BOOKED'] as const;
const EARTH_RADIUS_KM = 6371;
const DEFAULT_PHOTO_URL = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640&q=60';

/**
 * Suburb -> approximate GPS offset from the council base, in degrees. This is a documented
 * stand-in for a real geocoding integration: the demo dataset only has suburb names, not
 * street-level coordinates, so we deterministically derive a small offset per suburb instead
 * of geocoding addresses we don't have.
 */
function suburbOffset(suburb: string): { latOffset: number; lngOffset: number } {
  let hash = 0;
  for (let i = 0; i < suburb.length; i += 1) {
    hash = (hash * 31 + suburb.charCodeAt(i)) % 10_000;
  }
  const latOffset = ((hash % 100) / 100 - 0.5) * 0.08;
  const lngOffset = (((hash / 100) % 100) / 100 - 0.5) * 0.08;
  return { latOffset, lngOffset };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stageGate: StageGateService,
  ) {}

  /** Jobs in the inspector's council with a stage status of PAID_AWAITING_INSPECTION or BOOKED. */
  async queue(inspectorId: string): Promise<InspectionJobDto[]> {
    const inspector = await this.prisma.inspector.findUnique({ where: { id: inspectorId } });
    if (!inspector) throw new NotFoundException(`Inspector ${inspectorId} not found`);

    const stages = await this.prisma.stage.findMany({
      where: {
        status: { in: [...QUEUE_STATUSES] },
        permit: { councilId: inspector.councilId },
      },
      include: { permit: true },
      orderBy: { updatedAt: 'asc' },
    });

    const jobs = stages.map((stage) => {
      const { latOffset, lngOffset } = suburbOffset(stage.permit.suburb);
      const lat = inspector.baseLat + latOffset;
      const lng = inspector.baseLng + lngOffset;
      return {
        stageId: stage.id,
        permitRef: stage.permit.ref,
        stageKey: stage.key,
        stageLabel: stage.label,
        suburb: stage.permit.suburb,
        standNumber: stage.permit.standNumber,
        ownerName: stage.permit.ownerName,
        status: stage.status,
        bookedFor: stage.bookedFor ? stage.bookedFor.toISOString() : null,
        amountCents: stage.amountCents,
        gps: { lat, lng },
        distanceKm: Number(haversineKm(inspector.baseLat, inspector.baseLng, lat, lng).toFixed(2)),
      };
    });

    return jobs.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async book(dto: BookInspectionDto, actorId: string, actorRole: Role): Promise<StageDto> {
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    await this.stageGate.book(dto.stageId, date, actorId, actorRole);
    return this.loadStageDto(dto.stageId);
  }

  async signOff(dto: SignOffDto, inspectorId: string, actorId: string, actorRole: Role): Promise<SignOffResultDto> {
    const outcome = await this.stageGate.signOff({
      stageId: dto.stageId,
      result: dto.result,
      notes: dto.notes,
      photoUrl: dto.photoUrl ?? DEFAULT_PHOTO_URL,
      gpsLat: dto.gpsLat ?? 0,
      gpsLng: dto.gpsLng ?? 0,
      inspectorId,
      actorId,
      actorRole,
    });

    const stageDto = await this.loadStageDto(outcome.stage.id);

    return {
      stage: stageDto,
      ...(outcome.nextStageKey ? { nextStageKey: outcome.nextStageKey } : {}),
      ...(outcome.certificate ? { certificate: outcome.certificate } : {}),
    };
  }

  async reRequest(stageId: string, actorId: string, actorRole: Role): Promise<StageDto> {
    await this.stageGate.reRequest(stageId, actorId, actorRole);
    return this.loadStageDto(stageId);
  }

  private async loadStageDto(stageId: string): Promise<StageDto> {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      include: { payments: true, inspection: { include: { inspector: true } } },
    });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    return toStageDto(stage as StageWithRelations);
  }
}
