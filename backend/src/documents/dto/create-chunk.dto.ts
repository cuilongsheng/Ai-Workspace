import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentChunkDto {
  @ApiProperty({
    example: '人工确认后的知识片段',
    minLength: 1,
    maxLength: 12000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 12000)
  content: string;
}
