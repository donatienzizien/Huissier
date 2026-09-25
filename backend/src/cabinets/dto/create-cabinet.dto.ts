import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCabinetDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @Matches(/^[a-z][a-z0-9_]{2,30}$/, {
    message: 'Le slug doit être en minuscules, chiffres et underscores (3-30 caractères).',
  })
  slug: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  // Compte du premier utilisateur (Huissier admin du cabinet)
  @IsString()
  @MinLength(2)
  huissierNom: string;

  @IsString()
  @MinLength(2)
  huissierPrenom: string;

  @IsEmail()
  huissierEmail: string;
}
