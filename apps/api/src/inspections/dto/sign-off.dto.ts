import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { INSPECTION_RESULTS, type InspectionResult } from '../../common/domain';

/** Cap photo evidence payload (data-URL demo stand-in). Body parser limit is raised to match. */
const MAX_PHOTO_LENGTH = 1_500_000;

/** Body for POST /inspections/sign-off. */
export class SignOffDto {
  @IsString()
  @IsNotEmpty()
  stageId!: string;

  @IsIn(INSPECTION_RESULTS)
  result!: InspectionResult;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  notes!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_PHOTO_LENGTH)
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng?: number;
}
