import { ParsedDocument } from '../types/parsed-document.type';

export interface DocumentParser {
  supports(mimeType: string): boolean;
  parse(buffer: Buffer): Promise<ParsedDocument>;
}
