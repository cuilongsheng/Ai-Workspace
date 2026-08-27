import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, Length } from 'class-validator';

export class UpdateStarterQuestionsDto {
  @ApiProperty({ type: [String], maxItems: 8 })
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  questions: string[];
}
