import { IsISO8601, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateFactureDto {
  @IsUUID()
  dossierId: string;

  @IsNumber()
  @Min(1)
  montantTotal: number;

  @IsOptional()
  @IsISO8601()
  dateEcheance?: string;
}
