import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTiersDossierDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  debiteurId?: string;
}
