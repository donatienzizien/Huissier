import { IsOptional, IsString } from 'class-validator';

export class RejeterActeDto {
  @IsOptional()
  @IsString()
  motif?: string;
}
