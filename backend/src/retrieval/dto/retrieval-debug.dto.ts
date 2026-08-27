import { IsString, MaxLength, MinLength } from 'class-validator';

export class RetrievalDebugDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query: string;
}
