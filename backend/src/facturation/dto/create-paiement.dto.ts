import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const MODES_PAIEMENT = ['ESPECES', 'VIREMENT', 'MOBILE_MONEY'] as const;

export class CreatePaiementDto {
  @IsNumber()
  @Min(1)
  montant: number;

  @IsIn(MODES_PAIEMENT)
  mode: (typeof MODES_PAIEMENT)[number];

  @IsOptional()
  @IsString()
  reference?: string;
}
