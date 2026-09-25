import { IsIn } from 'class-validator';

export const STATUTS_DOSSIER = ['OUVERT', 'EN_COURS', 'CLOTURE', 'ARCHIVE'] as const;

export class UpdateStatutDossierDto {
  @IsIn(STATUTS_DOSSIER)
  statut: (typeof STATUTS_DOSSIER)[number];
}
