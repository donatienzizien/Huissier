import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTiersDossierDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  // Autorise explicitement null pour retirer un debiteur (pas seulement
  // undefined qui signifierait "ne pas toucher").
  @IsOptional()
  @IsUUID()
  debiteurId?: string | null;
}
