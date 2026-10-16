import { IsString, MinLength } from 'class-validator';

export class ChangerMotDePassePortailDto {
  @IsString()
  motDePasseActuel: string;

  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.' })
  nouveauMotDePasse: string;
}
