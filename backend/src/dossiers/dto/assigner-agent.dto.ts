import { IsOptional, IsUUID } from 'class-validator';

export class AssignerAgentDto {
  @IsOptional()
  @IsUUID()
  agentId?: string | null;
}
