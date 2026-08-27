export interface DocumentChunkResult {
  index: number;
  content: string;
  charCount: number;

  startOffset: number;
  endOffset: number;
  sectionIndex: number;
  sectionTitle: string | null;
  chunkInSection: number;
  sectionStartOffset: number;
  sectionEndOffset: number;
}
