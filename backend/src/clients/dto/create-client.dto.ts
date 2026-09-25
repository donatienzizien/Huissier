import { IsEmail, IsIn, IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export const CATEGORIES_CLIENT = [
  'PARTICULIER',
  'ENTREPRISE',
  'BANQUE',
  'BAILLEUR',
  'ADMINISTRATION',
  'AUTRE',
] as const;

export const TYPES_PIECE_IDENTITE = [
  'CNIB',
  'PASSEPORT',
  'CARTE_SEJOUR',
  'PERMIS_CONDUIRE',
  'AUTRE',
] as const;

// Role du tiers : CLIENT (mandant, paie le cabinet) ou DEBITEUR (poursuivi
// dans un dossier). Une meme fiche "clients" sert les deux roles, distingues
// par ce champ. Par defaut CLIENT pour rester compatible avec les fiches
// creees avant cette separation.
export const ROLES_TIERS = ['CLIENT', 'DEBITEUR'] as const;

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsIn(CATEGORIES_CLIENT)
  categorie?: (typeof CATEGORIES_CLIENT)[number];

  @IsOptional()
  @IsIn(ROLES_TIERS)
  role_tiers?: (typeof ROLES_TIERS)[number];

  @IsOptional()
  @IsString()
  nin?: string;

  @IsOptional()
  @IsString()
  ifu?: string;

  @IsOptional()
  @IsString()
  rccm?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  // --- Particuliers : piece d'identite + etat civil + profession --------

  @IsOptional()
  @IsIn(TYPES_PIECE_IDENTITE)
  type_piece?: (typeof TYPES_PIECE_IDENTITE)[number];

  @IsOptional()
  @IsISO8601()
  date_naissance?: string;

  @IsOptional()
  @IsString()
  lieu_naissance?: string;

  @IsOptional()
  @IsString()
  nationalite?: string;

  @IsOptional()
  @IsISO8601()
  date_delivrance_piece?: string;

  @IsOptional()
  @IsISO8601()
  date_expiration_piece?: string;

  @IsOptional()
  @IsString()
  lieu_delivrance_piece?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  // --- Entites : representant legal (utile pour signifier un acte) ------

  @IsOptional()
  @IsString()
  representant_nom?: string;

  @IsOptional()
  @IsString()
  representant_prenom?: string;

    @IsOptional()
  @IsString()
  representant_fonction?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}
