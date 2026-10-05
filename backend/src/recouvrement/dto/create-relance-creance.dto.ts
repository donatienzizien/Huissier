import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const CANAUX_RELANCE_CREANCE = [
  'EMAIL',
  'TELEPHONE',
  'SMS',
  'COURRIER',
  'WHATSAPP',
  'AUTRE',
] as const;

export class CreateRelanceCreanceDto {
  @IsIn(CANAUX_RELANCE_CREANCE)
  canal: (typeof CANAUX_RELANCE_CREANCE)[number];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  commentaire?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prochaineAction?: string;

  @IsOptional()
  @IsDateString()
  prochaineActionLe?: string;
}
