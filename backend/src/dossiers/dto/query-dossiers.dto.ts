import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { STATUTS_DOSSIER } from './update-statut-dossier.dto';
import { TYPES_DOSSIER } from './create-dossier.dto';

export class QueryDossiersDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STATUTS_DOSSIER)
  statut?: (typeof STATUTS_DOSSIER)[number];

  @IsOptional()
  @IsIn(TYPES_DOSSIER)
  type?: (typeof TYPES_DOSSIER)[number];

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  debiteurId?: string;

  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;
}
