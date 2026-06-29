import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

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
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'ownerPhone must be a valid phone number' })
  ownerPhone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  builderRegNumber!: string;
}
