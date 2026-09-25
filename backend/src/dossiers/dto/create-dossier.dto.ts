import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const TYPES_DOSSIER = [
  'RECOUVREMENT',
  'EXPULSION',
  'SIGNIFICATION',
  'SAISIE',
  'AUTRE',
] as const;

export class CreateDossierDto {
  @IsIn(TYPES_DOSSIER)
  type: (typeof TYPES_DOSSIER)[number];

  @IsUUID()
  clientId: string;

  // Optionnel pour rester rétrocompatible avec les dossiers créés avant
  // la séparation Client / Débiteur — mais fortement recommandé pour
  // tout nouveau dossier de recouvrement/saisie.
  @IsOptional()
  @IsUUID()
  debiteurId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;
}