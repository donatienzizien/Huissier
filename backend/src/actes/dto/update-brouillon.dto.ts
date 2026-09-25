import { IsString, MinLength } from 'class-validator';

export class UpdateBrouillonDto {
  @IsString()
  @MinLength(20)
  corpsHtml: string;
}
