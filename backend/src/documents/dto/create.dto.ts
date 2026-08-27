import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @Length(1, 30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description: string;
}
