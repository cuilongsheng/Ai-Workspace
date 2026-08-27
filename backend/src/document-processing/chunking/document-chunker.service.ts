import { Injectable } from '@nestjs/common';

export const DOCUMENT_INDEX_VERSION = 2;

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

interface DocumentSection {
  index: number;
  title: string | null;
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Hierarchical document chunker.
 *
 * Documents are first split into semantic parent sections and only then into
 * smaller retrieval chunks. Retrieval can therefore use a small child chunk
 * for precision and reconstruct the complete parent section for generation.
 */
@Injectable()
export class DocumentChunkerService {
  private readonly childChunkSize = 900;
  private readonly childOverlap = 120;
  private readonly minChildChunkSize = 320;
  private readonly maxGenericSectionSize = 3600;

  chunk(text: string): DocumentChunkResult[] {
    const normalizedText = this.normalize(text);
    if (!normalizedText) return [];

    const sections = this.splitIntoSections(normalizedText);
    const chunks: DocumentChunkResult[] = [];

    for (const section of sections) {
      const children = this.splitSection(section);
      for (const [chunkInSection, child] of children.entries()) {
        chunks.push({
          index: chunks.length,
          content: child.content,
          charCount: child.content.length,
          startOffset: section.startOffset + child.startOffset,
          endOffset: section.startOffset + child.endOffset,
          sectionIndex: section.index,
          sectionTitle: section.title,
          chunkInSection,
          sectionStartOffset: section.startOffset,
          sectionEndOffset: section.endOffset,
        });
      }
    }

    return chunks;
  }

  embeddingText(chunk: DocumentChunkResult): string {
    if (!chunk.sectionTitle || chunk.content.includes(chunk.sectionTitle)) {
      return chunk.content;
    }
    return `${chunk.sectionTitle}\n${chunk.content}`;
  }

  private splitIntoSections(text: string): DocumentSection[] {
    const structuralStarts = this.findStructuralStarts(text);
    const rawSections: Array<{ start: number; end: number }> = [];

    for (let index = 0; index < structuralStarts.length; index++) {
      const start = structuralStarts[index];
      const end = structuralStarts[index + 1] ?? text.length;
      if (end > start) rawSections.push({ start, end });
    }

    const sections: DocumentSection[] = [];
    for (const rawSection of rawSections) {
      for (const bounded of this.boundGenericSection(text, rawSection)) {
        const source = text.slice(bounded.start, bounded.end);
        const content = source.trim();
        if (!content) continue;
        const startOffset = bounded.start + source.indexOf(content);
        sections.push({
          index: sections.length,
          title: this.inferSectionTitle(content),
          content,
          startOffset,
          endOffset: startOffset + content.length,
        });
      }
    }
    return sections;
  }

  private findStructuralStarts(text: string): number[] {
    const starts = new Set<number>([0]);
    const patterns = [
      /^#{1,6}\s+.+$/gm,
      /^志愿\s*\n\s*\d+\s*\n/gm,
      /^(?:第[一二三四五六七八九十百零〇\d]+[章节篇部分]|[一二三四五六七八九十]+、)\s*[^\n]{1,80}$/gm,
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match.index !== undefined) starts.add(match.index);
      }
    }
    return [...starts].sort((left, right) => left - right);
  }

  private boundGenericSection(
    text: string,
    section: { start: number; end: number },
  ): Array<{ start: number; end: number }> {
    if (section.end - section.start <= this.maxGenericSectionSize) {
      return [section];
    }

    const bounded: Array<{ start: number; end: number }> = [];
    let start = section.start;
    while (start < section.end) {
      const maxEnd = Math.min(start + this.maxGenericSectionSize, section.end);
      const end =
        maxEnd === section.end
          ? maxEnd
          : this.findBestSplitPosition(
              text,
              start,
              maxEnd,
              Math.floor(this.maxGenericSectionSize * 0.55),
            );
      bounded.push({ start, end });
      start = end;
    }
    return bounded;
  }

  private splitSection(section: DocumentSection) {
    const chunks: Array<{
      content: string;
      startOffset: number;
      endOffset: number;
    }> = [];
    let start = 0;

    while (start < section.content.length) {
      const maxEnd = Math.min(
        start + this.childChunkSize,
        section.content.length,
      );
      let end = maxEnd;
      if (maxEnd < section.content.length) {
        end = this.findBestSplitPosition(
          section.content,
          start,
          maxEnd,
          this.minChildChunkSize,
        );
      }
      if (end - start < this.minChildChunkSize) end = maxEnd;

      const rawContent = section.content.slice(start, end);
      const content = rawContent.trim();
      if (content) {
        const contentStart = start + rawContent.indexOf(content);
        chunks.push({
          content,
          startOffset: contentStart,
          endOffset: contentStart + content.length,
        });
      }
      if (end >= section.content.length) break;
      start = Math.max(end - this.childOverlap, start + 1);
    }
    return chunks;
  }

  private inferSectionTitle(content: string): string | null {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) &&
          line !== '志愿' &&
          !/^\d+$/.test(line),
      );
    const markdownHeading = lines.find((line) => /^#{1,6}\s+/.test(line));
    if (markdownHeading) return markdownHeading.replace(/^#{1,6}\s+/, '');

    const institution = lines.find(
      (line) =>
        /(?:大学|学院|学校)(?:\([^)]*\)|（[^）]*）)?$/.test(line) &&
        line.length <= 80,
    );
    if (institution) {
      return institution.replace(/^(?:冲|稳|险|垫|兜|保)\s*/, '').trim();
    }

    const heading = lines.find(
      (line) =>
        line.length >= 2 && line.length <= 80 && !/[。！？；]$/.test(line),
    );
    return heading ?? null;
  }

  private normalize(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/(^|\n)志\s*\n\s*愿(?=\s*\n\s*\d+)/g, '$1志愿')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private findBestSplitPosition(
    text: string,
    start: number,
    maxEnd: number,
    minAdvance: number,
  ): number {
    const searchStart = Math.max(start + minAdvance, maxEnd - 600);
    const candidate = text.slice(searchStart, maxEnd);
    for (const separator of [
      '\n\n',
      '\n',
      '。',
      '！',
      '？',
      '. ',
      '! ',
      '? ',
      '；',
      '; ',
    ]) {
      const position = candidate.lastIndexOf(separator);
      if (position !== -1) return searchStart + position + separator.length;
    }
    return maxEnd;
  }
}
