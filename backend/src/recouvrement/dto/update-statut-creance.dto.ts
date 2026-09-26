import { IsIn } from 'class-validator';

export const STATUTS_CREANCE = [
  'BROUILLON',
  'ACTIVE',
  'EN_NEGOCIATION',
  'SUSPENDUE',
  'SOLDEE',
  'ABANDONNEE',
] as const;

export class UpdateStatutCreanceDto {
  @IsIn(STATUTS_CREANCE)
  statut: (typeof STATUTS_CREANCE)[number];
}
