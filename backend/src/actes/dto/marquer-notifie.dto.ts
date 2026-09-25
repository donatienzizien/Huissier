import { IsUUID } from 'class-validator';

export class MarquerNotifieDto {
  @IsUUID()
  agentId: string;
}
