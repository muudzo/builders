import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Body for POST /permits. */
export class CreatePermitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  standNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  suburb!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  projectType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  ownerPhone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  builderRegNumber!: string;
}
