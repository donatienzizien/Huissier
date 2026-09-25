import { IsIn, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const TYPES_ACTE = [
  'SIGNIFICATION',
  'COMMANDEMENT_PAYER',
  'PV_CONSTAT',
  'PV_SAISIE',
  'SOMMATION',
  'MISE_EN_DEMEURE',
  'ASSIGNATION',
  'CONGE_BAIL',
  'SAISIE_ATTRIBUTION',
  'SAISIE_VENTE',
  'SIGNIFICATION_JUGEMENT',
  'LETTRE_MISSION',
  'PROCURATION',
  'CONVENTION_HONORAIRES',
  'ACCUSE_RECEPTION_DOSSIER',
  'NANTISSEMENT',
  'LEGALISATION',
  'AUTRE',
] as const;

export const TYPES_LETTRE_CLIENT = [
  'LETTRE_MISSION',
  'PROCURATION',
  'CONVENTION_HONORAIRES',
] as const;

export class CreateActeDto {
  @IsUUID()
  dossierId: string;

  @IsUUID()
  modeleId: string;

  @IsOptional()
  @IsObject()
  contenu?: Record<string, unknown>;

  // HTML final tel qu'edite librement par l'utilisateur dans l'apercu -
  // si fourni, utilise tel quel comme corps du document (aucune fusion
  // Handlebars supplementaire). Si absent, le corps est calcule
  // automatiquement a partir du gabarit + contenu (comportement
  // retro-compatible avec la generation directe sans apercu prealable).
  @IsOptional()
  @IsString()
  @MinLength(20)
  corpsHtml?: string;
}
