import { Injectable } from '@nestjs/common';

import { DocumentParser } from './parser.interface';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class MarkdownParser implements DocumentParser {
  supports(mimeType: string): boolean {
    return ['text/markdown', 'text/x-markdown'].includes(mimeType);
  }

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const text = buffer
      .toString('utf-8')
      .replace(/^\uFEFF/, '')
      .trim();

    return {
      text,

      metadata: {
        encoding: 'utf-8',
      },
    };
  }
}
