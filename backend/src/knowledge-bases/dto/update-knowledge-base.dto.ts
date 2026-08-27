import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeBaseDto } from './create-knowledge-base.dto';

export class UpdateKnowledgeBaseDto extends PartialType(
  CreateKnowledgeBaseDto,
) {}
