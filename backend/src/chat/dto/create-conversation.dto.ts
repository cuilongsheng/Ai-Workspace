import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  organizationId: string;

  @IsString()
  departmentId: string;

  @IsString()
  knowledgeBaseId: string;

  @IsOptional()
  @IsString()
  title?: string;
}
