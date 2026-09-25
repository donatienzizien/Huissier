import { IsISO8601, IsOptional } from 'class-validator';

export class QueryRapportPeriodeDto {
  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;
}
