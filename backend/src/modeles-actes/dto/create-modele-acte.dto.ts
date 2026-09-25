import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TYPES_ACTE } from '../../actes/dto/create-acte.dto';

export const NIVEAUX_VALIDATION = ['CLERC', 'HUISSIER'] as const;

export class CreateModeleActeDto {
  @IsString()
  @MinLength(2)
  nom: string;

  @IsIn(TYPES_ACTE)
  type: (typeof TYPES_ACTE)[number];

  @IsString()
  @MinLength(20)
  templateHtml: string;

  @IsOptional()
  @IsIn(NIVEAUX_VALIDATION)
  niveauValidationRequis?: (typeof NIVEAUX_VALIDATION)[number];
}
