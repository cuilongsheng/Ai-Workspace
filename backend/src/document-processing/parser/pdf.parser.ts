import { Injectable } from '@nestjs/common';
import { DocumentParser } from './parser.interface';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfParser implements DocumentParser {
  supports(mimeType: string) {
    return mimeType === 'application/pdf';
  }

  async parse(buffer: Buffer) {
    const parser = new PDFParse({
      data: buffer,
    });
    try {
      const result = await parser.getText();
      return {
        text: result.text,
        metadata: {
          pages: result.total,
        },
      };
    } finally {
      await parser.destroy();
    }
  }
}
