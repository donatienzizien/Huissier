import { IsString, MinLength } from 'class-validator';

export class ChangerMotDePasseDto {
  @IsString()
  ancienMotDePasse: string;

  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
  nouveauMotDePasse: string;
}