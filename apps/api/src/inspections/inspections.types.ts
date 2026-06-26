import type { StageDto } from '../permits/permits.types';

export interface InspectionJobDto {
  stageId: string;
  permitRef: string;
  stageKey: string;
  stageLabel: string;
  suburb: string;
  standNumber: string;
  ownerName: string;
  status: string;
  bookedFor: string | null;
  amountCents: number;
  gps: { lat: number; lng: number };
  distanceKm: number;
}

export interface SignOffResultDto {
  stage: StageDto;
  nextStageKey?: string;
  certificate?: { serial: string; qrToken: string; issuedAt: string };
}
