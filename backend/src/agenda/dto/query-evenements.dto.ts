import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryEvenementsDto {
  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;

  @IsOptional()
  @IsUUID()
  assigneA?: string;
}
