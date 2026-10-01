import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const MODES_ENCAISSEMENT = [
  'ESPECES',
  'VIREMENT',
  'MOBILE_MONEY',
] as const;

export class CreateEncaissementDto {
  @IsNumber()
  @Min(1)
  montant: number;

  @IsIn(MODES_ENCAISSEMENT)
  mode: (typeof MODES_ENCAISSEMENT)[number];

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}