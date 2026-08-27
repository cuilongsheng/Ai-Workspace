import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';

import { DocumentParser } from './parser.interface';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class DocxParser implements DocumentParser {
  supports(mimeType: string): boolean {
    return (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({
      buffer,
    });

    return {
      text: result.value.trim(),

      metadata: {
        warnings: result.messages.map((message) => ({
          type: message.type,
          message: message.message,
        })),
      },
    };
  }
}
