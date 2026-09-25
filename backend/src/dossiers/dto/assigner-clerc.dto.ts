import { IsOptional, IsUUID } from 'class-validator';

export class AssignerClercDto {
  // null explicite retire l'attribution ; undefined = champ non fourni.
  @IsOptional()
  @IsUUID()
  clercId?: string | null;
}
