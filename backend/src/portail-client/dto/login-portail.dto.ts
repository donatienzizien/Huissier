import { IsEmail, IsString } from 'class-validator';

export class LoginPortailDto {
  @IsEmail()
  email: string;

  @IsString()
  motDePasse: string;
}