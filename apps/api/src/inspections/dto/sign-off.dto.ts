import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { INSPECTION_RESULTS, type InspectionResult } from '../../common/domain';

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
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @IsOptional()
  @IsNumber()
  gpsLng?: number;
}
