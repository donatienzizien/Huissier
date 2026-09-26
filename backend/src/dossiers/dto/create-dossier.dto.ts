import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';

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

  @IsUUID()
  debiteurId: string;

  @IsString()
  @MinLength(3)
  description: string;
}
