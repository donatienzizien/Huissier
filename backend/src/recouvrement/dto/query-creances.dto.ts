import {
  IsBooleanString,
  IsIn,
  IsISO8601,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { STATUTS_CREANCE } from './update-statut-creance.dto';

export class QueryCreancesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STATUTS_CREANCE)
  statut?: (typeof STATUTS_CREANCE)[number];

  @IsOptional()
  @IsUUID()
  dossierId?: string;

  @IsOptional()
  @IsUUID()
  debiteurId?: string;

  @IsOptional()
  @IsISO8601()
  dateExigibiliteAvant?: string;

  @IsOptional()
  @IsISO8601()
  dateExigibiliteApres?: string;

  @IsOptional()
  @IsBooleanString()
  enRetard?: string;
}
