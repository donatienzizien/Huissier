import { IsIn, IsOptional, IsUUID } from 'class-validator';

export const CATEGORIES_PIECE_JOINTE = [
  'ACTE_SIGNE_RETOURNE',
  'PIECE_IDENTITE',
  'JUSTIFICATIF',
  'AUTRE',
] as const;

export class CreatePieceJointeDto {
  @IsUUID()
  dossierId: string;

  @IsOptional()
  @IsIn(CATEGORIES_PIECE_JOINTE)
  categorie?: (typeof CATEGORIES_PIECE_JOINTE)[number];
}
