import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateModeleActeDto } from './create-modele-acte.dto';

export class UpdateModeleActeDto extends PartialType(CreateModeleActeDto) {
  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
