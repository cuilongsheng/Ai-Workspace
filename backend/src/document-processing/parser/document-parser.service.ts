import {
  Inject,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { DocumentParser } from './parser.interface';
import { ParsedDocument } from '../types/parsed-document.type';

export const DOCUMENT_PARSERS = Symbol('DOCUMENT_PARSERS');

@Injectable()
export class DocumentParserService {
  constructor(
    @Inject(DOCUMENT_PARSERS)
    private readonly parsers: DocumentParser[],
  ) {}

  supports(mimeType: string): boolean {
    return this.parsers.some((parser) => parser.supports(mimeType));
  }

  async parse(mimeType: string, buffer: Buffer): Promise<ParsedDocument> {
    const parser = this.parsers.find((parser) => parser.supports(mimeType));

    if (!parser) {
      throw new UnsupportedMediaTypeException(
        `Unsupported document type: ${mimeType}`,
      );
    }

    return parser.parse(buffer);
  }
}
