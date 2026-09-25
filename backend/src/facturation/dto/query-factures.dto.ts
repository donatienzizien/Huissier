import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const STATUTS_FACTURE = ['BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'ANNULEE'] as const;

export class QueryFacturesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STATUTS_FACTURE)
  statut?: (typeof STATUTS_FACTURE)[number];

  @IsOptional()
  @IsUUID()
  dossierId?: string;
}
