import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DocumentStatus } from 'src/generated/prisma/enums';

export class ListDocumentsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  pageNumber: number = 1;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
