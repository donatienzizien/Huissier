import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

export const STATUTS_CLIENT = ['ACTIF', 'SOLDE', 'INSOLVABLE'] as const;

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsOptional()
  @IsIn(STATUTS_CLIENT)
  statut?: (typeof STATUTS_CLIENT)[number];
}
