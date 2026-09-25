import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const TYPES_ACTE = [
  'SIGNIFICATION',
  'COMMANDEMENT_PAYER',
  'PV_CONSTAT',
  'PV_SAISIE',
  'SOMMATION',
  'MISE_EN_DEMEURE',
  'LETTRE_MISSION',
  'PROCURATION',
  'CONVENTION_HONORAIRES',
  'ACCUSE_RECEPTION_DOSSIER',
  'AUTRE',
] as const;

export class QueryActesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(TYPES_ACTE)
  type?: (typeof TYPES_ACTE)[number];

  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;
}