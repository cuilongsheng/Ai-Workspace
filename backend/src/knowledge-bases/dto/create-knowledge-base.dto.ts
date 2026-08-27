import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  description: string;
}
