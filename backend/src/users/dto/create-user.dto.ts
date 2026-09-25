import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @IsString()
  @MinLength(2)
  prenom: string;

  @IsEmail()
  email: string;

  @IsIn(['HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN'])
  role: 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN';
}
