import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateCreanceDto {
  @IsUUID()
  dossierId: string;

  @IsString()
  @MinLength(3)
  libelle: string;

  @IsNumber()
  @Min(1)
  montantInitial: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reference?: string;

  @IsOptional()
  @IsISO8601()
  dateExigibilite?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
