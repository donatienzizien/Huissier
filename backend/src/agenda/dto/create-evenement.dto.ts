import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEvenementDto {
  @IsString()
  @MinLength(2)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  dossierId?: string;

  @IsOptional()
  @IsUUID()
  assigneA?: string;

  @IsISO8601()
  dateDebut: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;

  @IsOptional()
  @IsBoolean()
  rappelJ1?: boolean;

  @IsOptional()
  @IsBoolean()
  rappelJ7?: boolean;
}
