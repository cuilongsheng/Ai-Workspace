import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KnowledgeBaseStatus } from 'src/generated/prisma/enums';

export class ListKnowledgeBaseDto {
  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  @IsString()
  sort: 'createAt' | 'updateAt' = 'createAt';

  @IsOptional()
  @IsString()
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsEnum(KnowledgeBaseStatus)
  status: KnowledgeBaseStatus = KnowledgeBaseStatus.ACTIVE;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageNumber: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize: number = 10;
}
