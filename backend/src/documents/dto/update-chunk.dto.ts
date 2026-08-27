import { PartialType } from '@nestjs/swagger';
import { CreateDocumentChunkDto } from './create-chunk.dto';

export class UpdateDocumentChunkDto extends PartialType(
  CreateDocumentChunkDto,
) {}
