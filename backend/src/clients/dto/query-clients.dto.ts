import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { STATUTS_CLIENT } from './update-client.dto';
import { CATEGORIES_CLIENT, ROLES_TIERS } from './create-client.dto';

export class QueryClientsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STATUTS_CLIENT)
  statut?: (typeof STATUTS_CLIENT)[number];

  @IsOptional()
  @IsIn(CATEGORIES_CLIENT)
  categorie?: (typeof CATEGORIES_CLIENT)[number];

  @IsOptional()
  @IsIn(ROLES_TIERS)
  roleTiers?: (typeof ROLES_TIERS)[number];
}
