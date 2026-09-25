import { IsOptional, IsString } from 'class-validator';

export class CreateRelanceDto {
  @IsOptional()
  @IsString()
  message?: string;
}
