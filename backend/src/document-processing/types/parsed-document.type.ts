export interface ParsedDocument {
  text: string;
  metadata?: {
    pages?: number;
    title?: string;
    author?: string;
    [key: string]: unknown;
  };
}
