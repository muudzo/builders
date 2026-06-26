import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

/** Body for POST /inspections/book. */
export class BookInspectionDto {
  @IsString()
  @IsNotEmpty()
  stageId!: string;

  @IsISO8601()
  date!: string;
}
