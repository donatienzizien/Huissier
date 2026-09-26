import { IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateCreanceDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  libelle?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  montantInitial?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reference?: string | null;

  @IsOptional()
  @IsISO8601()
  dateExigibilite?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;
}
